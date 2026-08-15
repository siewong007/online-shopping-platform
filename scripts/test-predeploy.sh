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
    case "${FAKE_INSPECT_ERROR:-}" in
      daemon)
        echo "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?" >&2
        exit 1 ;;
      absent)
        echo "Error: No such object: online-shopping-db" >&2
        exit 1 ;;
      generic)
        echo "some unexpected docker error" >&2
        exit 1 ;;
    esac
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
# so source a LF-normalized copy. deploy.sh loads deploy/backup-env-parser.sh from its own
# directory, so the parser is copied next to the LF copy just like the real install puts them in
# the same directory.
LF_DEPLOY="$TMP/deploy.sh"
sed 's/\r$//' "$ROOT/deploy/deploy.sh" > "$LF_DEPLOY"
cp "$ROOT/deploy/backup-env-parser.sh" "$TMP/backup-env-parser.sh"
# shellcheck disable=SC1090,SC1091,SC1094
source "$LF_DEPLOY"

ENV_FILE="$APP_DIR/backup.env"

reset_backup_dir() {
  rm -rf -- "$BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  unset FAKE_DB_RUNNING FAKE_DUMP_STATUS FAKE_AGE_MODE FAKE_INSPECT_ERROR || true
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

# ------------------------------------------------------------------------------------------
# 10. H2: pre-deploy backup lock contention with a bounded timeout -> clear failure, no hang
# ------------------------------------------------------------------------------------------
reset_backup_dir
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
exec 8>"$TMP/app/backup.lock"
flock -n 8
export DEPLOY_BACKUP_LOCK_TIMEOUT=1
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: lock contention should abort the deploy, not hang"
else
  PASS=$((PASS + 1)); echo "ok:   lock_contention_aborts_with_timeout"
fi
unset DEPLOY_BACKUP_LOCK_TIMEOUT
exec 8>&-
if grep -q "could not acquire the backup lock" "$TMP/.out"; then
  PASS=$((PASS + 1)); echo "ok:   lock_timeout_message_clear"
else
  echo "FAIL: lock timeout message absent"; sed 's/^/      /' "$TMP/.out" | head -n 5; FAIL=$((FAIL+1))
fi

# ------------------------------------------------------------------------------------------
# 11. H4: container absent (first deploy) -> pre-deploy backup skipped cleanly
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_INSPECT_ERROR=absent
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  PASS=$((PASS + 1)); echo "ok:   absent_container_skips_cleanly"
else
  FAIL=$((FAIL + 1)); echo "FAIL: absent container should skip, not abort"; sed 's/^/      /' "$TMP/.out" | head -n 5
fi
if [[ -n "$(find "$BACKUP_DIR" -maxdepth 1 \( -name 'predeploy-*' -o -name '.predeploy.*' \) 2>/dev/null)" ]]; then echo "FAIL: artifacts created while container absent"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 12. H4: docker daemon unreachable -> pre-deploy backup FAILS CLOSED, never silently skipped
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_INSPECT_ERROR=daemon
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: daemon-unreachable must abort the deploy"
else
  PASS=$((PASS + 1)); echo "ok:   daemon_unreachable_aborts"
fi
if grep -q "cannot reach the docker daemon" "$TMP/.out"; then
  PASS=$((PASS + 1)); echo "ok:   daemon_unreachable_message_clear"
else
  echo "FAIL: daemon-unreachable message absent"; sed 's/^/      /' "$TMP/.out" | head -n 5; FAIL=$((FAIL+1))
fi

# ------------------------------------------------------------------------------------------
# 13. H4: unexpected docker inspect failure -> abort (fail closed)
# ------------------------------------------------------------------------------------------
reset_backup_dir
export FAKE_INSPECT_ERROR=generic
write_env <<'EOF'
BACKUP_AGE_RECIPIENT=age1recipient
EOF
if run_predeploy; then
  FAIL=$((FAIL + 1)); echo "FAIL: generic inspect error must abort the deploy"
else
  PASS=$((PASS + 1)); echo "ok:   generic_inspect_error_aborts"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-PREDEPLOY: FAIL"
  exit 1
fi
echo "TEST-PREDEPLOY: PASS"
exit 0