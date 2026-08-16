#!/usr/bin/env bash
#
# N5 parity test: scripts/preflight-backup.sh and deploy/backup.sh MUST agree on the capacity
# rule (deploy/backup-capacity.sh) for identical inputs. Before N5 the preflight used a flat
# 1 GiB gate and the backup used its own estimate — they could disagree. Now both use the shared
# rule, so the preflight verdict is only trustworthy if a backup run passes/fails EXACTLY at the
# same free-space boundary:
#
#   1. preflight PASS with avail == required (boundary)   and backup.sh PASS at the same avail
#   2. preflight FAIL with avail == required - 1          and backup.sh FAIL at the same avail
#   3. floor sanity: with no DB size and no prior archive, the shared 100 MiB floor applies
#      identically in both scripts.
#
# Uses stub docker/age/age-keygen/rclone/df/date (real sha256sum/flock/stat/install/df-fallback).
# Requires: bash, coreutils. No real docker/rclone/age needed.
#   scripts/test-preflight-capacity.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFLIGHT_SH="$ROOT/scripts/preflight-backup.sh"
BACKUP_SH="$ROOT/deploy/backup.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-preflight-capacity.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
case "${1:-}" in
  inspect) printf '%s\n' "${FAKE_DB_RUNNING:-true}"; exit 0 ;;
  exec)
    if [[ "$*" == *"pg_database_size"* ]]; then
      printf '%s\n' "${FAKE_DB_SIZE:-}"
      exit 0
    fi
    printf 'PGDMP\nfake-custom-dump-payload\n'
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

cat > "$FAKEBIN/age" <<'AGE'
#!/usr/bin/env bash
out=""
prev=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then out="$a"; fi
  prev="$a"
done
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

cat > "$FAKEBIN/age-keygen" <<'KEYGEN'
#!/usr/bin/env bash
if [[ "${1:-}" == "-y" ]]; then
  printf 'age1fake-derived-public-recipient\n'
  exit 0
fi
printf 'AGE-SECRET-KEY-1FAKE\n'
exit 0
KEYGEN
chmod 0700 "$FAKEBIN/age-keygen"

cat > "$FAKEBIN/rclone" <<'RCLONE'
#!/usr/bin/env bash
resolve() {
  local p="$1"
  p="${p#proof-remote:}"
  printf '%s' "$p"
}
case "${1:-}" in
  listremotes) printf 'proof-remote:\n'; exit 0 ;;
  lsf) exit 0 ;;
  copy)
    src="$(resolve "${@: -2:1}")"
    dest="$(resolve "${@: -1}")"
    mkdir -p "$dest"
    cp -f "$src" "$dest/$(basename "$src")"
    exit 0 ;;
  hashsum) exit 0 ;;
  delete) exit 0 ;;
  *) exit 0 ;;
esac
RCLONE
chmod 0700 "$FAKEBIN/rclone"

cat > "$FAKEBIN/df" <<'DF'
#!/usr/bin/env bash
if [[ -n "${FAKE_DF_AVAIL:-}" ]]; then
  printf 'Avail\n%s\n' "$FAKE_DF_AVAIL"
  exit 0
fi
exec /usr/bin/df "$@"
DF
chmod 0700 "$FAKEBIN/df"

cat > "$FAKEBIN/date" <<'DATE'
#!/usr/bin/env bash
case "$*" in
  *%Y-%m-%dT%H:%M:%SZ*) printf '%s\n' "${FAKE_DATE_ISO_Z:-2026-01-01T00:00:00Z}" ;;
  *%Y%m%dT%H%M%SZ*)     printf '%s\n' "${FAKE_DATE_COMPACT:-20260101T000000Z}" ;;
  *%u*)                 printf '%s\n' "${FAKE_DATE_DOW:-1}" ;;
  *%s*)                 printf '%s\n' "${FAKE_DATE_EPOCH:-1735689600}" ;;
  *) exit 1 ;;
esac
DATE
chmod 0700 "$FAKEBIN/date"

export PATH="$FAKEBIN:$PATH"

APP_DIR="$TMP/app"
LOCAL_DIR="$TMP/local"
ENV_DIR="$TMP/env"
RCLONE_CONF="$TMP/rclone/rclone.conf"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$ENV_DIR" "$TMP/rclone"
cat > "$RCLONE_CONF" <<EOF
[proof-remote]
type = local
EOF

write_env() {
  cat > "$ENV_DIR/backup.env"
  chmod 0600 "$ENV_DIR/backup.env"
}
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$TMP/remote
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF

export BACKUP_APP_DIR="$APP_DIR"
export BACKUP_CONFIG_FILE="$ENV_DIR/backup.env"
export BACKUP_STATUS_FILE="$APP_DIR/backup-status.json"
export BACKUP_LOCK_FILE="$APP_DIR/backup.lock"

expect_preflight() {
  local name="$1" expected="$2"
  local out rc=0
  set +e
  out=$(PREFLIGHT_CONFIG_FILE="$ENV_DIR/backup.env" PREFLIGHT_LOCAL_DIR="$LOCAL_DIR" \
    PREFLIGHT_RCLONE_CONF="$RCLONE_CONF" bash "$PREFLIGHT_SH" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" == "$expected" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name (rc $rc)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected rc $expected, got $rc"; printf '%s\n' "$out" | head -n 8
  fi
}

expect_backup() {
  local name="$1" expected="$2" category_needle="${3:-}"
  local out rc=0
  rm -rf "${APP_DIR:?}"/* "${LOCAL_DIR:?}"/* "$TMP/remote"
  mkdir -p "$APP_DIR" "$LOCAL_DIR" "$TMP/remote"
  set +e
  out=$(bash "$BACKUP_SH" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" == "$expected" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name (rc $rc)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected rc $expected, got $rc"; printf '%s\n' "$out" | head -n 8
  fi
  if [[ -n "$category_needle" ]] && ! grep -qF "$category_needle" <<<"$out"; then
    FAIL=$((FAIL + 1)); echo "FAIL: $name — output missing '$category_needle'"
  fi
}

# Deterministic inputs: DB size 200 MiB, retention 2 -> required = 200MiB * (2+2) + 512MiB.
FAKE_DB_SIZE=209715200
REQUIRED=$(( FAKE_DB_SIZE * 4 + 536870912 ))

# 1. Boundary: preflight PASS with avail == required
export FAKE_DF_AVAIL="$REQUIRED"
export FAKE_DB_SIZE="$FAKE_DB_SIZE"
expect_preflight "preflight_pass_at_required_boundary" 0

# 2. Boundary: backup.sh PASS with avail == required (same shared rule, same inputs)
expect_backup "backup_pass_at_required_boundary" 0

# 3. Just below: preflight FAIL with avail == required - 1
export FAKE_DF_AVAIL=$(( REQUIRED - 1 ))
expect_preflight "preflight_fail_below_required" 1

# 4. Just below: backup.sh FAIL with the same avail (insufficient_staging_space)
expect_backup "backup_fail_below_required" 1 "insufficient_staging_space"

# 5. Floor sanity: no DB size probe answer and no prior archive -> both scripts use the shared
#    100 MiB floor: required = 100MiB * (2+2) + 512MiB.
unset FAKE_DB_SIZE
FLOOR_REQUIRED=$(( 104857600 * 4 + 536870912 ))
export FAKE_DF_AVAIL="$FLOOR_REQUIRED"
expect_preflight "preflight_pass_at_floor_boundary" 0
expect_backup "backup_pass_at_floor_boundary" 0
export FAKE_DF_AVAIL=$(( FLOOR_REQUIRED - 1 ))
expect_preflight "preflight_fail_below_floor" 1
expect_backup "backup_fail_below_floor" 1 "insufficient_staging_space"

# ------------------------------------------------------------------------------------------
# D1: the LOCAL retention count resolves through ONE shared default/rule (deploy/backup-capacity.sh)
# in BOTH scripts. The strict parser exports only keys PRESENT in backup.env, so an OMITTED key
# stays unset: backup.sh used to default it to 3 while the preflight effectively used 0 — the
# disagreement band below (between required(0) and required(3)) is where the preflight passed
# while a real backup run failed. An explicit value must be honored and validated identically.
# ------------------------------------------------------------------------------------------
export FAKE_DB_SIZE=209715200

# D1a: omitted key -> both use the SHARED default (3): required = 200MiB * (3+2) + 512MiB.
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$TMP/remote
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
OMIT_REQUIRED=$(( 209715200 * 5 + 536870912 ))
export FAKE_DF_AVAIL="$OMIT_REQUIRED"
expect_preflight "preflight_omitted_retention_uses_shared_default" 0
expect_backup "backup_omitted_retention_uses_shared_default" 0
# The disagreement band: old code passed the preflight here (required(0) = 200MiB*2+512MiB
# = 956301312, far below) while backup.sh required the full 1585446912 -> preflight PASS but
# backup FAIL. Both must now FAIL below the shared-default requirement.
export FAKE_DF_AVAIL=$(( OMIT_REQUIRED - 1 ))
expect_preflight "preflight_omitted_retention_fails_below_shared_default_requirement" 1
expect_backup "backup_omitted_retention_fails_below_shared_default_requirement" 1 "insufficient_staging_space"

# D1b: explicit 0 -> REJECTED by both (backup.sh's rule: positive integer).
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$TMP/remote
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_LOCAL_RETENTION_COUNT=0
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
expect_preflight "preflight_explicit_zero_retention_rejected" 1 "positive integer"
expect_backup "backup_explicit_zero_retention_rejected" 1 "must be a positive integer"

# D1c: explicit 5 -> honored identically at the 5-boundary: required = 200MiB * (5+2) + 512MiB.
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$TMP/remote
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_LOCAL_RETENTION_COUNT=5
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
FIVE_REQUIRED=$(( 209715200 * 7 + 536870912 ))
export FAKE_DF_AVAIL="$FIVE_REQUIRED"
expect_preflight "preflight_explicit_five_retention_boundary" 0
expect_backup "backup_explicit_five_retention_boundary" 0
export FAKE_DF_AVAIL=$(( FIVE_REQUIRED - 1 ))
expect_preflight "preflight_explicit_five_retention_below" 1
expect_backup "backup_explicit_five_retention_below" 1 "insufficient_staging_space"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-PREFLIGHT-CAPACITY: FAIL"
  exit 1
fi
echo "TEST-PREFLIGHT-CAPACITY: PASS"
exit 0