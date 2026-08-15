#!/usr/bin/env bash
#
# Tests for the encrypted pre-deploy database backup in deploy/deploy.sh
# (backup_existing_database). Sources the REAL deploy.sh (its entrypoint is behind a source guard)
# and exercises the function with stub docker/age binaries against a temp APP_DIR/BACKUP_DIR.
#
# Requires: bash, coreutils (flock, stat, find, sed, grep, head, mktemp, install, tail, sort, cut).
# No age/rclone/docker needed.
# Run on any Linux host:  scripts/test-predeploy.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-predeploy.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/bin/bash
case "${1:-}" in
  inspect)
    printf '%s\n' "${FAKE_DB_RUNNING:-true}"
    exit 0 ;;
  exec)
    if [[ "${FAKE_DUMP_STATUS:-0}" != "0" ]]; then
      echo "pg_dump failed" >&2
      exit "$FAKE_DUMP_STATUS"
    fi
    printf 'PGDMP\nfake-custom-dump-payload\n'
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

cat > "$FAKEBIN/age" <<'AGE'
#!/bin/bash
out=""
prev=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then
    out="$a"
  fi
  prev="$a"
done
case "${FAKE_AGE_MODE:-ok}" in
  fail)
    echo "age error" >&2
    exit 5 ;;
  partial)
    printf 'age-encryption.org/v1\npartial' > "$out"
    exit 6 ;;
esac
printf 'age-encryption.org/v1\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

export PATH="$FAKEBIN:$PATH"

# Isolated, source-guarded deploy paths.
export DEPLOY_APP_DIR="$TMP/app"
export DEPLOY_BACKUP_DIR="$TMP/app/backups"
mkdir -p "$DEPLOY_APP_DIR" "$DEPLOY_BACKUP_DIR"
APP_DIR="$DEPLOY_APP_DIR"
BACKUP_DIR="$DEPLOY_BACKUP_DIR"

# Source the real deploy.sh (defines functions only; the entrypoint guard skips execution). The
# working copy carries Windows CRLF line endings, which bash would choke on at "set ... pipefail\r",
# so source a LF-normalized copy.
LF_DEPLOY="$TMP/deploy.sh"
sed 's/\r$//' "$ROOT/deploy/deploy.sh" > "$LF_DEPLOY"
# shellcheck disable=SC1090,SC1091,SC1094
source "$LF_DEPLOY"

ENV_FILE="$APP_DIR/backup.env"

reset_backup_dir() {
  rm -rf -- "$BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  unset FAKE_DB_RUNNING FAKE_DUMP_STATUS FAKE_AGE_MODE || true
}

write_env() {
  cat > "$ENV_FILE"
  chmod 0600 "$ENV_FILE"
}

run_predeploy() {
  local rc
  set +e
  ( backup_existing_database ) >"$TMP/.out" 2>&1
  rc=$?
  set -e
  return "$rc"
}

# ------------------------------------------------------------------------------------------
# 1. Encrypted predeploy success: valid .dump.age, mode 0600, no plaintext, no temp leftovers
# ------------------------------------------------------------------------------------------
reset_backup_dir
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  PASS=$((PASS + 1)); echo "ok:   encrypted_predeploy_success"
else
  FAIL=$((FAIL + 1)); echo "FAIL: encrypted_predeploy_success (rc $?)"; sed 's/^/      /' "$TMP/.out" | head -n 10
fi
NEW="$(find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump.age' | head -n 1)"
if [[ -z "$NEW" ]]; then echo "FAIL: no encrypted predeploy file created"; FAIL=$((FAIL+1)); fi
if [[ -n "$NEW" && "$(stat -c %a "$NEW")" != "600" ]]; then echo "FAIL: encrypted predeploy mode not 0600"; FAIL=$((FAIL+1)); fi
if [[ -n "$NEW" ]] && ! head -c 100 "$NEW" | grep -q '^age-encryption.org/v1'; then echo "FAIL: encrypted predeploy has no age header"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump' 2>/dev/null)" ]]; then echo "FAIL: plaintext predeploy dump exists"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 -name '.predeploy.*' 2>/dev/null)" ]]; then echo "FAIL: predeploy temp file left behind"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 2. pg_dump failure -> abort, no artifacts
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_DUMP_STATUS=3
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: pg_dump failure should abort"
else
  PASS=$((PASS + 1)); echo "ok:   pg_dump_failure_aborts"
fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 \( -name 'predeploy-*' -o -name '.predeploy.*' \) 2>/dev/null)" ]]; then echo "FAIL: artifacts after pg_dump failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 3. age failure -> abort, no artifacts, no plaintext
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_AGE_MODE=fail
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: age failure should abort"
else
  PASS=$((PASS + 1)); echo "ok:   age_failure_aborts"
fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 \( -name 'predeploy-*' -o -name '.predeploy.*' \) 2>/dev/null)" ]]; then echo "FAIL: artifacts after age failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 4. Missing recipient -> abort with config error, no artifacts
# ------------------------------------------------------------------------------------------
reset_backup_dir
write_env <<'EOF'
BACKUP_RCLONE_REMOTE=
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: missing recipient should abort"
else
  PASS=$((PASS + 1)); echo "ok:   missing_recipient_aborts"
fi
if ! grep -q "BACKUP_AGE_RECIPIENT" "$TMP/.out"; then echo "FAIL: missing-recipient error message absent"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 \( -name 'predeploy-*' -o -name '.predeploy.*' \) 2>/dev/null)" ]]; then echo "FAIL: artifacts without recipient"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 5. Missing backup.env -> abort
# ------------------------------------------------------------------------------------------
reset_backup_dir
rm -f "$ENV_FILE"
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: missing backup.env should abort"
else
  PASS=$((PASS + 1)); echo "ok:   missing_env_aborts"
fi

# ------------------------------------------------------------------------------------------
# 6. Missing age command -> abort before dumping
# ------------------------------------------------------------------------------------------
reset_backup_dir
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
mkdir -p "$TMP/nopost"
for t in date grep head mktemp chmod mv find rm sed install sort cut tail flock; do
  ln -sf "/usr/bin/$t" "$TMP/nopost/$t"
done
ln -sf "$FAKEBIN/docker" "$TMP/nopost/docker"
if ( PATH="$TMP/nopost" backup_existing_database ) >"$TMP/.out2" 2>&1; then
  FAIL=$((FAIL + 1)); echo "FAIL: missing age should abort"
else
  PASS=$((PASS + 1)); echo "ok:   missing_age_command_aborts"
fi
if ! grep -q "install age" "$TMP/.out2"; then echo "FAIL: missing-age error message absent"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 7. Incomplete encrypted artifact cleanup (age writes partial then fails)
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_AGE_MODE=partial
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: partial age should abort"
else
  PASS=$((PASS + 1)); echo "ok:   incomplete_artifact_cleans_up"
fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 \( -name 'predeploy-*.dump.age' -o -name '.predeploy.*' \) 2>/dev/null)" ]]; then echo "FAIL: incomplete artifact not cleaned"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 8. No plaintext .dump remains: legacy plaintext predeploy dumps are removed
# ------------------------------------------------------------------------------------------
reset_backup_dir
touch "$BACKUP_DIR/predeploy-20260101T000000Z.dump"
touch "$BACKUP_DIR/predeploy-20260102T000000Z.dump"
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  PASS=$((PASS + 1)); echo "ok:   legacy_plaintext_removed"
else
  FAIL=$((FAIL + 1)); echo "FAIL: success run with legacy plaintext failed"; sed 's/^/      /' "$TMP/.out" | head -n 10
fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 -name '*.dump' 2>/dev/null)" ]]; then echo "FAIL: plaintext .dump still on disk"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: expected exactly one encrypted predeploy"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 9. Retention keeps the newest 3 encrypted predeploy backups, deletes only the oldest
# ------------------------------------------------------------------------------------------
reset_backup_dir
for old in 20260101T000000Z 20260102T000000Z 20260103T000000Z; do
  touch -d '2026-01-01 00:00:00' "$BACKUP_DIR/predeploy-$old.dump.age"
done
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  PASS=$((PASS + 1)); echo "ok:   predeploy_retention_keeps_newest_3"
else
  FAIL=$((FAIL + 1)); echo "FAIL: retention run failed"; sed 's/^/      /' "$TMP/.out" | head -n 10
fi
if [[ "$(find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump.age' | wc -l)" != 3 ]]; then echo "FAIL: expected 3 encrypted predeploy backups after retention"; FAIL=$((FAIL+1)); fi
NEWEST="$(find "$BACKUP_DIR" -maxdepth 1 -name 'predeploy-*.dump.age' -printf '%T@ %f\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
if [[ "$NEWEST" != predeploy-* ]]; then echo "FAIL: newest encrypted predeploy missing"; FAIL=$((FAIL+1)); fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-PREDEPLOY: FAIL"
  exit 1
fi
echo "TEST-PREDEPLOY: PASS"
exit 0