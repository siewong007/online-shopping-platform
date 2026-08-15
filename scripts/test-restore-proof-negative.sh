#!/usr/bin/env bash
#
# C3 negative tests: prove that a "restore proof" CANNOT pass when the target is empty, damaged,
# or the source cannot be read. Each case is expected to FAIL (nonzero exit).
#
#   1. rp_empty         - throwaway target that was never restored -> parity MUST fail.
#   2. rp_damaged       - a full backup+restore, then damage orders/products in the target
#                         -> row-count and content-fingerprint parity MUST fail.
#   3. rp_wrong_source  - backup.sh with an unreadable source database -> MUST fail (dump_failed),
#                         status must record the failure (never a stale ok).
#
# Uses the REAL deploy/backup.sh, deploy/restore.sh and the parity stage of restore-proof.sh
# (RP_ONLY_PARITY=1) against throwaway containers. Requires: bash, docker, age, age-keygen, rclone.
#   scripts/test-restore-proof-negative.sh
set -Eeuo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-online-shopping-db}"
SOURCE_USER="${SOURCE_USER:-project_depot}"
SOURCE_DB="${SOURCE_DB:-project_depot}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-project_depot}"
TARGET_USER="${TARGET_USER:-restore}"
TARGET_PASSWORD="${TARGET_PASSWORD:-restore}"
TARGET_DB="${TARGET_DB:-restore_proof}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:19beta1}"
TARGET_CONTAINER="${TARGET_CONTAINER:-online-shopping-restore-proof-neg}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SH="$REPO_ROOT/deploy/backup.sh"
RESTORE_SH="$REPO_ROOT/deploy/restore.sh"
RESTORE_PROOF_SH="$REPO_ROOT/scripts/restore-proof.sh"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/restore-proof-neg.XXXXXX")"
chmod 0700 "$WORK"
PASS=0
FAIL=0
trap 'set +e; docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

for tool in docker age age-keygen rclone; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

running=$(docker inspect --format '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null || true)
[[ "$running" == "true" ]] || { echo "source DB container $SOURCE_CONTAINER is not running" >&2; exit 1; }

# --- shared: disposable age keypair + local-type rclone remote --------------------------------
age-keygen -o "$WORK/identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/identity.txt"
RECIPIENT="$(age-keygen -y "$WORK/identity.txt" 2>/dev/null | tail -n 1)"
mkdir -p "$WORK/rclone"
cat > "$WORK/rclone/rclone.conf" <<EOF
[proof-remote]
type = local
EOF
export RCLONE_CONFIG="$WORK/rclone/rclone.conf"
REMOTE_NAME="proof-remote"
REMOTE_PATH="$WORK/offserver"
LOCAL_DIR="$WORK/local"
APP_DIR="$WORK/app"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"

write_env() {
  cat > "$WORK/backup.env"
  chmod 0600 "$WORK/backup.env"
}
export BACKUP_APP_DIR="$APP_DIR"
export BACKUP_CONFIG_FILE="$WORK/backup.env"
export BACKUP_STATUS_FILE="$APP_DIR/backup-status.json"
export BACKUP_LOCK_FILE="$APP_DIR/backup.lock"

wait_ready() {
  local i=0
  while (( i < 60 )); do
    if docker exec "$TARGET_CONTAINER" pg_isready -U "$TARGET_USER" -d "$TARGET_DB" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

start_target() {
  docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$TARGET_CONTAINER" \
    -e "POSTGRES_USER=$TARGET_USER" \
    -e "POSTGRES_PASSWORD=$TARGET_PASSWORD" \
    -e "POSTGRES_DB=$TARGET_DB" \
    "$POSTGRES_IMAGE" >/dev/null
  wait_ready || { echo "FAIL: target never became ready" >&2; exit 1; }
}

expect_fail() {
  local name="$1" rc=0
  shift
  set +e
  "$@" >"$WORK/.out" 2>&1
  rc=$?
  set -e
  if (( rc != 0 )); then
    PASS=$((PASS + 1)); echo "ok:   $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name (expected nonzero, got 0)"; sed 's/^/      /' "$WORK/.out" | head -n 20
  fi
}

# --- case 1: empty target ----------------------------------------------------------------------
echo "== case 1: restore proof against an EMPTY target must fail"
start_target
expect_fail "rp_empty_target_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -q 'PARITY: FAIL' "$WORK/.out" || { echo "FAIL: empty-target case did not print PARITY: FAIL"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 2: damaged target --------------------------------------------------------------------
echo "== case 2: full backup + restore, then damage, proof must fail"
rm -rf "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
write_env <<EOF
BACKUP_AGE_RECIPIENT=$RECIPIENT
BACKUP_RCLONE_REMOTE=$REMOTE_NAME
BACKUP_RCLONE_PATH=$REMOTE_PATH
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_REMOTE_DAILY_RETENTION=2
BACKUP_REMOTE_WEEKLY_RETENTION=1
BACKUP_WEEKLY_DAY=7
BACKUP_DB_CONTAINER=$SOURCE_CONTAINER
BACKUP_DB_USER=$SOURCE_USER
BACKUP_DB_NAME=$SOURCE_DB
EOF
bash "$BACKUP_SH" >/dev/null 2>&1 || { echo "FAIL: backup.sh failed in damaged case setup" >&2; exit 1; }
ARCHIVE="$LOCAL_DIR/$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$APP_DIR/backup-status.json" | head -n 1)"
[[ -f "$ARCHIVE" ]] || { echo "FAIL: archive missing" >&2; exit 1; }
start_target
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >/dev/null

# Damage: delete rows from orders and mutate a row in products.
docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "DELETE FROM public.orders WHERE stock_released_at IS NOT NULL" >/dev/null
docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "UPDATE public.products SET source_item_code = source_item_code || '-damaged' WHERE id = (SELECT min(id) FROM public.products)" >/dev/null

expect_fail "rp_damaged_target_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -qE 'MISMATCH|mismatch' "$WORK/.out" || { echo "FAIL: damaged case did not report a parity mismatch"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 3: wrong source credentials -----------------------------------------------------------
echo "== case 3: backup.sh against an unreadable source must fail (no stale ok)"
rm -rf "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
write_env <<EOF
BACKUP_AGE_RECIPIENT=$RECIPIENT
BACKUP_RCLONE_REMOTE=$REMOTE_NAME
BACKUP_RCLONE_PATH=$REMOTE_PATH
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_DB_CONTAINER=$SOURCE_CONTAINER
BACKUP_DB_USER=$SOURCE_USER
BACKUP_DB_NAME=no_such_database
EOF
expect_fail "rp_wrong_source_db_fails" bash "$BACKUP_SH"
if grep -q '"error_category": "dump_failed"' "$APP_DIR/backup-status.json"; then
  PASS=$((PASS + 1)); echo "ok:   rp_wrong_source_records_dump_failed"
else
  FAIL=$((FAIL + 1)); echo "FAIL: rp_wrong_source_records_dump_failed (status: $(cat "$APP_DIR/backup-status.json" 2>/dev/null || echo missing))"
fi
grep -q '"status": "ok"' "$APP_DIR/backup-status.json" && { echo "FAIL: wrong-source run left a stale ok"; FAIL=$((FAIL+1)); }

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "RESTORE-PROOF-NEGATIVE: FAIL"
  exit 1
fi
echo "RESTORE-PROOF-NEGATIVE: PASS"
exit 0