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
printf '%s\n' "$*" >> "${FAKEBIN_DIR:-/nonexistent}/docker-argv.log"
case "${1:-}" in
  inspect)
    printf '%s\n' "${FAKE_DB_RUNNING:-true}"
    exit 0 ;;
  exec)
    if [[ "${FAKE_DUMP_STATUS:-0}" != "0" ]]; then
      echo "pg_dump failed" >&2
      exit "$FAKE_DUMP_STATUS"
    fi
    if [[ -n "${FAKE_DUMP_DELAY:-}" ]]; then
      sleep "$FAKE_DUMP_DELAY"
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
  nostanza)
    # D2/D6: an age header WITHOUT a well-formed X25519 recipient stanza (e.g. passphrase mode).
    printf 'age-encryption.org/v1\n-> nope-not-a-stanza\n' > "$out"
    exit 0 ;;
esac
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$out"
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
    src="$(resolve "${@: -2:1}")"
    dest="$(resolve "${@: -1}")"
    mkdir -p "$dest"
    # Sidecar-missing simulation: the .sha256 upload/download is silently skipped.
    if [[ "${FAKE_RCLONE_SIDECAR_MISSING:-0}" == "1" && "$src" == *.sha256 ]]; then
      exit 0
    fi
    # N7 (sidecar negative, stub-driven): upload a WRONG sidecar content — the remote .sha256
    # then matches neither the local sidecar nor the remote archive. Deterministic real-tool
    # injection is impossible (the verify re-downloads the actual uploaded bytes), so this is the
    # stub equivalent of a corrupted or maliciously-replaced sidecar.
    if [[ "${FAKE_RCLONE_SIDECAR_WRONG:-0}" == "1" && "$src" == *.sha256 ]]; then
      printf 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef  wrong\n' \
        > "$dest/$(basename "$src")"
      exit 0
    fi
    cp -f "$src" "$dest/$(basename "$src")"
    # Corruption simulation: the remote copy of the archive differs from the local file.
    if [[ "${FAKE_RCLONE_CORRUPT:-0}" == "1" && "$src" == *.dump.age ]]; then
      printf 'CORRUPT' >> "$dest/$(basename "$src")"
    fi
    exit 0 ;;
  lsf)
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
  hashsum)
    if [[ "${FAKE_RCLONE_HASHSUM_BAD:-0}" == "1" ]]; then
      printf '00000000000000000000000000000000  %s\n' "$(basename "${@: -1}")"
      exit 0
    fi
    f="$(resolve "${@: -1}")"
    if [[ -f "$f" ]]; then
      md5sum "$f"
    fi
    exit 0 ;;
  delete)
    if [[ "${FAKE_RCLONE_DELETE_FAIL:-0}" == "1" ]]; then
      echo "rclone delete failed" >&2
      exit 8
    fi
    f="$(resolve "${@: -1}")"
    rm -f "$f"
    exit 0 ;;
  *) exit 0 ;;
esac
RCLONE
chmod 0700 "$FAKEBIN/rclone"

# Deterministic clock (H8): backup.sh reads the time with `date -u +%Y%m%dT%H%M%SZ`, `+%u`,
# `+%Y-%m-%dT%H:%M:%SZ` and `+%s` (N9: RUN_START / duration_seconds); the stub serves them from
# the FAKE_DATE_* environment so weekly-tier behaviour and run-duration accounting are fully
# deterministic regardless of the real day of the week.
cat > "$FAKEBIN/date" <<'DATE'
#!/usr/bin/env bash
if [[ "${FAKE_DATE_FAIL:-0}" == "1" && "$*" == *%Y%m%dT%H%M%SZ* ]]; then
  echo "date failed" >&2
  exit 1
fi
case "$*" in
  *%Y-%m-%dT%H:%M:%SZ*) printf '%s\n' "${FAKE_DATE_ISO_Z:-2026-01-01T00:00:00Z}" ;;
  *%Y%m%dT%H%M%SZ*)     printf '%s\n' "${FAKE_DATE_COMPACT:-20260101T000000Z}" ;;
  *%u*)                 printf '%s\n' "${FAKE_DATE_DOW:-1}" ;;
  *%s*)                 printf '%s\n' "${FAKE_DATE_EPOCH:-1735689600}" ;;
  *) exit 1 ;;
esac
DATE
chmod 0700 "$FAKEBIN/date"

# Capacity-safety stub: backup.sh reads `df --output=avail -B1 <dir>`. When FAKE_DF_AVAIL is set
# it is reported verbatim (tiny values force the insufficient_staging_space path); otherwise the
# real df is used so normal cases see the host's actual free space.
cat > "$FAKEBIN/df" <<'DF'
#!/usr/bin/env bash
if [[ -n "${FAKE_DF_AVAIL:-}" ]]; then
  printf 'Avail\n%s\n' "$FAKE_DF_AVAIL"
  exit 0
fi
exec /usr/bin/df "$@"
DF
chmod 0700 "$FAKEBIN/df"

# ------------------------------------------------------------------------------------------
# Case setup helpers
# ------------------------------------------------------------------------------------------
CASE_TMP=""
CASE_IDX=0
setup_case() {
  CASE_IDX=$((CASE_IDX + 1))
  CASE_TMP="$(mktemp -d "$TMP/case.XXXXXX")"
  mkdir -p "$CASE_TMP/app" "$CASE_TMP/local" "$CASE_TMP/remote"
  : > "$CASE_TMP/app/backup-status.json"
  export BACKUP_APP_DIR="$CASE_TMP/app"
  export BACKUP_CONFIG_FILE="$CASE_TMP/backup.env"
  export BACKUP_STATUS_FILE="$CASE_TMP/app/backup-status.json"
  export BACKUP_LOCK_FILE="$CASE_TMP/app/backup.lock"
  export PATH="$FAKEBIN:$PATH"
  export FAKEBIN_DIR="$FAKEBIN"
  export FAKE_RCLONE_ROOT=""
  # Each case gets a UNIQUE timestamp so the "fresh" archive never collides with fixture files,
  # and the clock is deterministic for the weekly-tier tests.
  local day
  day=$(printf '%02d' $(( CASE_IDX % 28 + 1 )))
  export FAKE_DATE_COMPACT="202609${day}T120000Z"
  export FAKE_DATE_ISO_Z="2026-09-${day}T12:00:00Z"
  export FAKE_DATE_DOW=1
  unset FAKE_DB_RUNNING FAKE_DUMP_STATUS FAKE_AGE_MODE FAKE_RCLONE_MODE FAKE_RCLONE_LSF_SIZE \
        FAKE_RCLONE_DELETE_FAIL FAKE_RCLONE_HASHSUM_BAD FAKE_RCLONE_CORRUPT FAKE_RCLONE_SIDECAR_MISSING \
        FAKE_RCLONE_SIDECAR_WRONG FAKE_DATE_FAIL FAKE_DUMP_DELAY FAKE_DF_AVAIL || true
  : > "$FAKEBIN/docker-argv.log"
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
  [[ -z "$(find "$CASE_TMP/local" "$CASE_TMP/remote" -type f ! -name '*.dump.age' ! -name '*.sha256' 2>/dev/null)" ]] \
    && [[ -z "$(find "$CASE_TMP/local" -maxdepth 1 -type d -name '.backup.*' -o -name '.verify.*' 2>/dev/null)" ]]
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
if [[ "$(status_category)" != "" ]]; then echo "FAIL: success case has error_category '$(status_category)'"; FAIL=$((FAIL+1)); fi
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
# 7b. D2/D6: age output with a header but NO valid X25519 recipient stanza -> encrypt_failed
# (the old standalone `grep -c` assignment aborted before the fail() diagnostic), no artifacts
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_AGE_MODE=nostanza
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "stanza_less_output_rejected" "expected nonzero + encrypt_failed + no artifacts" bash "$BACKUP_SH"
if [[ "$(status_category)" != "encrypt_failed" ]]; then echo "FAIL: expected category encrypt_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ -n "$(find "$CASE_TMP/local" -name '*.dump.age' 2>/dev/null)" ]]; then echo "FAIL: stanza-less output looks like a backup"; FAIL=$((FAIL+1)); fi
assert_no_backup_artifacts || { echo "FAIL: leftover staging dir after stanza-less age output"; FAIL=$((FAIL+1)); }
unset FAKE_AGE_MODE

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
BACKUP_RCLONE_PATH=$BAD_PATH
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
  touch -d '2026-01-01 00:00:00' "$CASE_TMP/remote/online-shopping-$old.dump.age.sha256"
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
# N8: the .sha256 sidecar is pruned TOGETHER with its archive, retained ones are kept, and the
# fresh backup's sidecar is uploaded.
if [[ -f "$CASE_TMP/remote/online-shopping-20260101T000000Z-daily.dump.age.sha256" ]]; then echo "FAIL: sidecar of the pruned remote daily was not pruned"; FAIL=$((FAIL+1)); fi
if [[ ! -f "$CASE_TMP/remote/online-shopping-20260102T000000Z-daily.dump.age.sha256" ]]; then echo "FAIL: sidecar of the retained remote daily was deleted"; FAIL=$((FAIL+1)); fi
if [[ ! -f "$CASE_TMP/remote/online-shopping-20260103T000000Z-weekly.dump.age.sha256" ]]; then echo "FAIL: sidecar of the retained remote weekly was deleted"; FAIL=$((FAIL+1)); fi
if [[ -n "$FRESH_NAME" && ! -f "$CASE_TMP/remote/$FRESH_NAME.sha256" ]]; then echo "FAIL: fresh remote backup '$FRESH_NAME' has no uploaded .sha256 sidecar"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 12. Remote upload verification hash mismatch -> backup fails, local copy retained
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_CORRUPT=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "upload_verify_corrupt_fails" "corrupt remote object must fail verification" bash "$BACKUP_SH"
if [[ "$(status_category)" != "upload_verify_failed" ]]; then echo "FAIL: expected category upload_verify_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: valid local backup deleted after verify failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 12b. Remote upload verification missing sidecar -> backup fails, local copy retained
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_SIDECAR_MISSING=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "upload_verify_missing_sidecar_fails" "missing .sha256 sidecar must fail verification" bash "$BACKUP_SH"
if [[ "$(status_category)" != "upload_verify_failed" ]]; then echo "FAIL: expected category upload_verify_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: valid local backup deleted after verify failure"; FAIL=$((FAIL+1)); fi

# ------------------------------------------------------------------------------------------
# 12c. Remote upload verification WRONG sidecar content -> backup fails, local copy retained
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_RCLONE_SIDECAR_WRONG=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "upload_verify_wrong_sidecar_fails" "wrong .sha256 sidecar content must fail verification" bash "$BACKUP_SH"
if [[ "$(status_category)" != "upload_verify_failed" ]]; then echo "FAIL: expected category upload_verify_failed, got '$(status_category)'"; FAIL=$((FAIL+1)); fi
if [[ "$(find "$CASE_TMP/local" -name '*.dump.age' | wc -l)" != 1 ]]; then echo "FAIL: valid local backup deleted after sidecar-content verify failure"; FAIL=$((FAIL+1)); fi

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
# 14. H1: SIGTERM mid-run -> status records "interrupted", never a stale ok
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DUMP_DELAY=2
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
bash "$BACKUP_SH" >"$TMP/.out" 2>&1 &
BK_PID=$!
sleep 1
kill -TERM "$BK_PID" 2>/dev/null || true
wait "$BK_PID" 2>/dev/null || BK_RC=$?
if [[ "$(status_category)" != "interrupted" ]]; then
  echo "FAIL: SIGTERM run should record category 'interrupted', got '$(status_category)'"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   interrupted_records_interrupted"
fi
grep -q '"status": "ok"' "$CASE_TMP/app/backup-status.json" && { echo "FAIL: interrupted run looks healthy"; FAIL=$((FAIL+1)); }
if (( BK_RC == 130 )); then
  PASS=$((PASS + 1)); echo "ok:   interrupted_exit_130"
else
  echo "FAIL: interrupted exit code $BK_RC (expected 130)"; FAIL=$((FAIL+1))
fi
assert_no_backup_artifacts || { echo "FAIL: interrupted run left artifacts"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 15. H1: SIGKILL mid-run -> status stays "running" (never ok, never stale success)
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DUMP_DELAY=2
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
bash "$BACKUP_SH" >"$TMP/.out" 2>&1 &
BK_PID=$!
sleep 1
kill -KILL "$BK_PID" 2>/dev/null || true
wait "$BK_PID" 2>/dev/null || BK_RC=$?
if grep -q '"status": "ok"' "$CASE_TMP/app/backup-status.json"; then
  echo "FAIL: SIGKILL run left a stale 'ok' status"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   sigkill_never_leaves_stale_ok"
fi
if grep -q '"status": "running"' "$CASE_TMP/app/backup-status.json"; then
  PASS=$((PASS + 1)); echo "ok:   sigkill_leaves_running_marker"
else
  echo "FAIL: SIGKILL run should leave 'running' (status: $(cat "$CASE_TMP/app/backup-status.json"))"; FAIL=$((FAIL+1))
fi

# ------------------------------------------------------------------------------------------
# 16. H1: unexpected error (ERR trap) -> status "unexpected_error"
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DATE_FAIL=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "unexpected_error_classified" "unexpected failures record unexpected_error" bash "$BACKUP_SH"
if [[ "$(status_category)" != "unexpected_error" ]]; then
  echo "FAIL: expected category unexpected_error, got '$(status_category)'"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   unexpected_error_category"
fi

# ------------------------------------------------------------------------------------------
# 17. H8: weekly tier is deterministic from the (fake) day of week, never the real calendar
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DATE_DOW=7
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_WEEKLY_DAY=7
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t "weekly_tier_on_sunday" "Sunday + weekly_day 7 produces a weekly archive" bash "$BACKUP_SH"
WEEKLY_NAME="$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$CASE_TMP/app/backup-status.json" | head -n 1)"
if [[ "$WEEKLY_NAME" == *"-weekly.dump.age" ]]; then
  PASS=$((PASS + 1)); echo "ok:   weekly_name_deterministic"
else
  echo "FAIL: expected weekly name, got '$WEEKLY_NAME'"; FAIL=$((FAIL+1))
fi
setup_case
export FAKE_DATE_DOW=1
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_WEEKLY_DAY=7
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t "daily_tier_on_monday" "Monday + weekly_day 7 produces a daily archive" bash "$BACKUP_SH"
DAILY_NAME="$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$CASE_TMP/app/backup-status.json" | head -n 1)"
if [[ "$DAILY_NAME" == *"-daily.dump.age" ]]; then
  PASS=$((PASS + 1)); echo "ok:   daily_name_deterministic"
else
  echo "FAIL: expected daily name, got '$DAILY_NAME'"; FAIL=$((FAIL+1))
fi

# ------------------------------------------------------------------------------------------
# 18. M5: retention is ordered by the ISO timestamp in the NAME, never by mtime
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
# 20260101 has the NEWEST mtime but the OLDEST name: name-based retention must still prune it.
touch -d '2030-01-01 00:00:00' "$CASE_TMP/local/online-shopping-20260101T000000Z-daily.dump.age"
touch -d '2020-01-01 00:00:00' "$CASE_TMP/local/online-shopping-20260102T000000Z-daily.dump.age"
touch -d '2030-01-01 00:00:00' "$CASE_TMP/remote/online-shopping-20260101T000000Z-daily.dump.age"
touch -d '2020-01-01 00:00:00' "$CASE_TMP/remote/online-shopping-20260102T000000Z-daily.dump.age"
t "retention_by_name_not_mtime" "oldest name pruned even when its mtime is newest" bash "$BACKUP_SH"
if [[ -f "$CASE_TMP/local/online-shopping-20260101T000000Z-daily.dump.age" ]]; then
  echo "FAIL: local 20260101 (newest mtime) was not pruned — retention used mtime"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   local_pruned_by_name"
fi
if [[ ! -f "$CASE_TMP/local/online-shopping-20260102T000000Z-daily.dump.age" ]]; then
  echo "FAIL: local 20260102 should be retained"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   local_kept_second_newest_name"
fi
if [[ -f "$CASE_TMP/remote/online-shopping-20260101T000000Z-daily.dump.age" ]]; then
  echo "FAIL: remote 20260101 (newest mtime) was not pruned"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   remote_pruned_by_name"
fi

# ------------------------------------------------------------------------------------------
# 19. Capacity safety: insufficient free space fails before staging
# ------------------------------------------------------------------------------------------
setup_case
export FAKE_DF_AVAIL=1000000   # 1 MB free space, far below required
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
EOF
t_expect_fail "capacity_check_fails_on_low_disk" "refuses to start when space below requirement" bash "$BACKUP_SH"
if [[ "$(status_category)" != "insufficient_staging_space" ]]; then
  echo "FAIL: expected category insufficient_staging_space, got '$(status_category)'"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   capacity_check_rejects_insufficient_space"
fi
assert_no_backup_artifacts || { echo "FAIL: artifacts created despite insufficient capacity"; FAIL=$((FAIL+1)); }

# ------------------------------------------------------------------------------------------
# 20. M3: database password travels via docker exec -e PGPASSWORD (env inheritance), never argv value
# ------------------------------------------------------------------------------------------
setup_case
write_env <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_RCLONE_REMOTE=proof-remote
BACKUP_RCLONE_PATH=$CASE_TMP/remote
BACKUP_LOCAL_DIR=$CASE_TMP/local
BACKUP_DB_CONTAINER=online-shopping-db
BACKUP_DB_USER=shop_admin
BACKUP_DB_NAME=online_shopping
BACKUP_DB_PASSWORD=supersecret_fake_password_12345
EOF
t "password_via_env_not_argv" "backup succeeds with BACKUP_DB_PASSWORD set" bash "$BACKUP_SH"
EXEC_LINE="$(grep -E '^exec ' "$FAKEBIN/docker-argv.log" | head -n 1 || true)"
if [[ "$EXEC_LINE" == *"-e PGPASSWORD "* || "$EXEC_LINE" == *"-e PGPASSWORD" ]]; then
  PASS=$((PASS + 1)); echo "ok:   pgpassword_inherited_by_name"
else
  echo "FAIL: -e PGPASSWORD not found in docker argv (line: $EXEC_LINE)"; FAIL=$((FAIL+1))
fi
if grep -q "supersecret_fake_password_12345" "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: password value leaked into docker argv!"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   password_value_never_in_argv"
fi
if [[ "$EXEC_LINE" == *"postgres://"* ]]; then
  echo "FAIL: conninfo URI present in docker exec argv"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   no_conninfo_uri_in_argv"
fi
if [[ "$EXEC_LINE" == *"--password"* || "$EXEC_LINE" == *"-W"* ]]; then
  echo "FAIL: pg_dump prompted for a password in argv"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   no_password_flag_in_argv"
fi

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