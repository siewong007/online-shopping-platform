#!/usr/bin/env bash
#
# Failure-path tests for deploy/backup.sh. Runs the real script against stub docker/age/rclone
# binaries so each failure mode is exercised without touching a real database or remote.
#
# Requires: bash, coreutils (flock, stat, find, awk, sed, mktemp). No age/rclone/docker needed.
# Run on any Linux host:  scripts/test-backup.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SH="$ROOT/deploy/backup.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-backup.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

t() {
  local name="$1" desc="$2" rc=0
  shift 2
  if "$@" >"$TMP/.out" 2>&1; then rc=0; else rc=$?; fi
  if (( rc == 0 )); then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — $desc"
    sed 's/^/      /' "$TMP/.out" | head -n 20
  fi
}

t_expect_fail() {
  local name="$1" desc="$2" rc=0
  shift 2
  if "$@" >"$TMP/.out" 2>&1; then rc=0; else rc=$?; fi
  if (( rc != 0 )); then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — $desc"
    sed 's/^/      /' "$TMP/.out" | head -n 20
  fi
}

# ------------------------------------------------------------------------------------------
# Stub tools. The fake rclone behaves like a real local backend so retention/verification logic
# is exercised for real; the fake docker/age simulate the failure injection points. All FAKE_*
# switches are read from the environment, so tests export them.
# ------------------------------------------------------------------------------------------
FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
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
#!/usr/bin/env bash
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

cat > "$FAKEBIN/rclone" <<'RCLONE'
#!/usr/bin/env bash
resolve() {
  local p="$1"
  p="${p#proof-remote:}"
  printf '%s' "$p"
}
case "${1:-}" in
  copy)
    if [[ "${FAKE_RCLONE_MODE:-ok}" == "fail" ]]; then
      echo "rclone copy failed" >&2
      exit 7
    fi
    local src dest
    src="${@: -2:1}"
    dest="$(resolve "${@: -1}")"
    mkdir -p "$dest"
    cp -f "$src" "$dest/$(basename "$src")"
    exit 0 ;;
  lsf)
    local d fmt="p" sep=$'\t' a
    d="$(resolve "${@: -1}")"
    for a in "$@"; do
      if [[ "$prev" == "--format" ]]; then fmt="$a"; fi
      if [[ "$prev" == "--separator" ]]; then sep="$a"; fi
      prev="$a"
    done
    if [[ "$fmt" == "sp" ]]; then
      if [[ -n "${FAKE_RCLONE_LSF_SIZE:-}" ]]; then
        # Simulate a remote object whose reported size does not match the local file.
        find "$d" -maxdepth 1 -type f -printf '%f\n' 2>/dev/null | sort | while IFS= read -r f; do
          printf '%s\t%s\n' "$FAKE_RCLONE_LSF_SIZE" "$f"
        done
      else
        find "$d" -maxdepth 1 -type f -printf '%s\t%f\n' 2>/dev/null | sort
      fi
    else
      find "$d" -maxdepth 1 -type f -printf '%f\n' 2>/dev/null | sort
    fi
    exit 0 ;;
  delete)
    if [[ "${FAKE_RCLONE_DELETE_FAIL:-0}" == "1" ]]; then
      echo "rclone delete failed" >&2
      exit 8
    fi
    local f
    f="$(resolve "${@: -1}")"
    rm -f "$f"
    exit 0 ;;
  *) exit 0 ;;
esac
RCLONE
chmod 0700 "$FAKEBIN/rclone"

# ------------------------------------------------------------------------------------------
# Case setup helpers
# ------------------------------------------------------------------------------------------
CASE_TMP=""
setup_case() {
  CASE_TMP="$(mktemp -d "$TMP/case.XXXXXX")"
  mkdir -p "$CASE_TMP/app" "$CASE_TMP/local" "$CASE_TMP/remote"
  : > "$CASE_TMP/app/backup-status.json"
  export BACKUP_APP_DIR="$CASE_TMP/app"
  export BACKUP_CONFIG_FILE="$CASE_TMP/backup.env"
  export BACKUP_STATUS_FILE="$CASE_TMP/app/backup-status.json"
  export BACKUP_LOCK_FILE="$CASE_TMP/app/backup.lock"
  export PATH="$FAKEBIN:$PATH"
  export FAKE_RCLONE_ROOT=""
  unset FAKE_DB_RUNNING FAKE_DUMP_STATUS FAKE_AGE_MODE FAKE_RCLONE_MODE FAKE_RCLONE_LSF_SIZE FAKE_RCLONE_DELETE_FAIL || true
}

write_env() {
  cat > "$CASE_TMP/backup.env"
  chmod 0600 "$CASE_TMP/backup.env"
}

status_category() {
  if [[ -f "$CASE_TMP/app/backup-status.json" ]]; then
    sed -n 's/.*"error_category"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CASE_TMP/app/backup-status.json" | head -n 1
  fi
}

assert_no_backup_artifacts() {
  [[ -z "$(find "$CASE_TMP/local" "$CASE_TMP/remote" -type f ! -name '*.dump.age' 2>/dev/null)" ]] \
    && [[ -z "$(find "$CASE_TMP/local" -maxdepth 1 -type d -name '.backup.*' 2>/dev/null)" ]]
}

# ------------------------------------------------------------------------------------------
# 1. Success: encrypted file created, uploaded, verified, status ok, no plaintext anywhere
# ------------------------------------------------------------------------------------------
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_REMOTE_DAILY_RETENTION=2
BACKUP_REMOTE_WEEKLY_RETENTION=1
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t "success_encrypted_upload" "expected exit 0, status ok, remote+local file present, no plaintext" bash "$BACKUP_SH"
if [[ "$(status_category)" != "" ]]; then echo "FAIL: success case has error_category '$ (status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: local encrypted file missing"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/remote" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: remote encrypted file missing"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: plaintext/leftover artifact in success case"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 2. Missing age recipient -> fail closed, nothing uploaded
# ------------------------------------------------------------------------------------------
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "missing_recipient_fails_closed" "expected nonzero + config error + no remote file" bash "$BACKUP_SH"
if [[ "$(status_category)" != "config" ]]; then echo "FAIL: expected category config, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$CASE_TMP/remote" -type f 2>/dev/null)" ]]; then echo "FAIL: upload happened without recipient"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 3. Missing rclone remote -> fail closed
# ------------------------------------------------------------------------------------------
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "missing_rclone_remote_fails_closed" "expected nonzero + config error" bash "$BACKUP_SH"
if [[ "$(status_category)" != "config" ]]; then echo "FAIL: expected category config, got '$(status_category)'"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 4. DB container unavailable
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DB_RUNNING=false
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "db_unavailable_fails" "expected nonzero + db_unavailable" bash "$BACKUP_SH"
if [[ "$(status_category)" != "db_unavailable" ]]; then echo "FAIL: expected category db_unavailable, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: artifacts created while db down"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 5. pg_dump failure -> no backup, staging cleaned, nothing uploaded
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DUMP_STATUS=3
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "dump_failure_cleans_up" "expected nonzero + dump_failed + no artifacts" bash "$BACKUP_SH"
if [[ "$(status_category)" != "dump_failed" ]]; then echo "FAIL: expected category dump_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: leftover artifacts after dump failure"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 6. age failure -> no backup, no plaintext, staging cleaned
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_AGE_MODE=fail
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "age_failure_cleans_up" "expected nonzero + encrypt_failed + no artifacts" bash "$BACKUP_SH"
if [[ "$(status_category)" != "encrypt_failed" ]]; then echo "FAIL: expected category encrypt_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: leftover artifacts after age failure"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 7. age partial-then-fail -> no final .dump.age, no leftover staging dirs
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_AGE_MODE=partial
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "incomplete_file_never_becomes_backup" "expected nonzero + no final file + no staging dirs" bash "$BACKUP_SH"
if [[ "$(status_category)" != "encrypt_failed" ]]; then echo "FAIL: expected category encrypt_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$CASE_TMP/local" -name '*.dump.age' 2>/dev/null)" ]]; then echo "FAIL: partial output looks like a backup"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: leftover staging dir after partial age"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 8. rclone upload failure -> status error, valid local file KEPT (not deleted by retention)
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_MODE=fail
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "upload_failure_keeps_local_backup" "expected nonzero + upload_failed + local file retained" bash "$BACKUP_SH"
if [[ "$(status_category)" != "upload_failed" ]]; then echo "FAIL: expected category upload_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: valid local backup was deleted on upload failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 9. Concurrent invocation -> second run exits nonzero, status untouched
# ------------------------------------------------------------------------------------------
setup_case
exec 9>"$CASE_TMP/app/backup.lock"
flock -n 9
printf '{"status":"ok"}\n' > "$CASE_TMP/app/backup-status.json"
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "concurrent_invocation_locked_out" "expected nonzero + lock message + status untouched" bash "$BACKUP_SH"
grep -q "already running" "$TMP/.out" || { echo "FAIL: lock message missing"; FAIL=$((FAIL+1)); }
grep -q '"status":"ok"' "$CASE_TMP/app/backup-status.json" || { echo "FAIL: status clobbered by locked-out run"; FAIL=$((FAIL+1)); }
exec 9>&-

# ------------------------------------------------------------------------------------------
# 10. Unsafe destination path -> config error before any rclone call
# ------------------------------------------------------------------------------------------
for BAD_PATH in "/" "$CASE_TMP/../escape" "two words"; do
  setup_case
  write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH="$BAD_PATH"
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
  t_expect_fail "unsafe_destination_($BAD_PATH)_rejected" "expected nonzero + config + no artifacts" bash "$BACKUP_SH"
  if [[ "$(status_category)" != "config" ]]; then echo "FAIL: expected config for path '$BAD_PATH', got '$(status_category)'"; FAIL=$((FAIL+1)); fi
  assert_no_backup_artifacts || { echo "FAIL: artifacts for unsafe path '$BAD_PATH'"; FAIL=$((FAIL+1)); }
done

# ------------------------------------------------------------------------------------------
# 11. Retention prunes oldest only, keeps newest, never deletes the fresh backup
# ------------------------------------------------------------------------------------------
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_REMOTE_DAILY_RETENTION=2
BACKUP_REMOTE_WEEKLY_RETENTION=1
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
for old in 20260101T000000Z-daily 20260102T000000Z-daily 20260103T000000Z-weekly; do
  touch -d '2026-01-01 00:00:00' "$CASE_TMP/local/online-shopping-$old.dump.age"
  touch -d '2026-01-01 00:00:00' "$CASE_TMP/remote/online-shopping-$old.dump.age"
done
t "retention_prunes_oldest_only" "expected success + local keeps 2 + remote keeps daily<=2 weekly<=1 + fresh kept" bash "$BACKUP_SH"
LOCAL_AFTER="$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)"
REMOTE_DAILY="$(find "$CASE_TMP/remote" -name '*daily*.dump.age' | wc -l)"
REMOTE_WEEKLY="$(find "$CASE_TMP/remote" -name '*weekly*.dump.age' | wc -l)"
REMOTE_TOTAL="$(find "$CASE_TMP/remote" -name '*.dump.age' | wc -l)"
FRESH_NAME="$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$CASE_TMP/app/backup-status.json" | head -n 1)"
if [[ "$LOCAL_AFTER" != 2 ]]; then echo "FAIL: local retention (expected 2, got $LOCAL_AFTER)"; FAIL=$((FAIL+1)); fi
if [[ "$REMOTE_DAILY" -gt 2 ]]; then echo "FAIL: remote daily retention (got $REMOTE_DAILY)"; FAIL=$((FAIL+1)); fi
if [[ "$REMOTE_WEEKLY" -gt 1 ]]; then echo "FAIL: remote weekly retention (got $REMOTE_WEEKLY)"; FAIL=$((FAIL+1)); fi
if [[ "$REMOTE_TOTAL" -lt 2 ]]; then echo "FAIL: remote should keep at least the fresh + 1 retained (got $REMOTE_TOTAL)"; FAIL=$((FAIL+1)); fi
NEWEST_LOCAL="$(find "$CASE_TMP/local" -name '*.dump.age' -printf '%T@ %f\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
if [[ "$NEWEST_LOCAL" != online-shopping-* ]]; then echo "FAIL: newest local backup missing"; FAIL=$((FAIL+1)); fi
if [[ -n "$FRESH_NAME" && ! -f "$CASE_TMP/remote/$FRESH_NAME" ]]; then echo "FAIL: the freshly created remote backup '$FRESH_NAME' did not survive retention"; FAIL=$((FAIL+1)); fi
if [[ -f "$CASE_TMP/remote/online-shopping-20260101T000000Z-daily.dump.age" ]]; then echo "FAIL: oldest remote daily was not pruned"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 12. Remote upload verification size mismatch -> backup fails, local copy retained
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_LSF_SIZE=12345
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "upload_verify_size_mismatch_fails" "expected nonzero + upload_verify_failed + local retained" bash "$BACKUP_SH"
if [[ "$(status_category)" != "upload_verify_failed" ]]; then echo "FAIL: expected category upload_verify_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: valid local backup deleted after verify failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 13. rclone retention delete failure -> warning only, backup reports ok, valid backups survive
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_DELETE_FAIL=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_REMOTE_DAILY_RETENTION=2
BACKUP_REMOTE_WEEKLY_RETENTION=1
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
for old in 20260101T000000Z-daily 20260102T000000Z-daily 20260103T000000Z-weekly; do
  touch -d '2026-01-01 00:00:00' "$CASE_TMP/local/online-shopping-$old.dump.age"
  touch -d '2026-01-01 00:00:00' "$CASE_TMP/remote/online-shopping-$old.dump.age"
done
t "rclone_delete_failure_is_nonfatal" "expected exit 0 + status ok + fresh backup survives + deletes skipped" bash "$BACKUP_SH"
FRESH13="$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$CASE_TMP/app/backup-status.json" | head -n 1)"
if [[ "$(status_category)" != "" ]]; then echo "FAIL: delete-failure case has error_category '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ -n "$FRESH13" && ! -f "$CASE_TMP/remote/$FRESH13" ]]; then echo "FAIL: fresh remote backup missing after delete failure"; FAIL=$((FAIL+1)); fi
REMOTE_ALL="$(find "$CASE_TMP/remote" -name '*.dump.age' | wc -l)"
if [[ "$REMOTE_ALL" != 4 ]]; then echo "FAIL: remote deletions should have been skipped (expected 4, got $REMOTE_ALL)"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 2 ]]; then echo "FAIL: local retention should still prune (got $(find "$CASE_TMP/local" -name '*.dump.age' | wc -l))"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------------------
echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-BACKUP: FAIL"
  exit 1
fi
echo "TEST-BACKUP: PASS"
exit 0