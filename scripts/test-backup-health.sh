#!/usr/bin/env bash
#
# Unit tests for scripts/check-backup-health.sh.
#
# Tests detection of:
#   - missing status file
#   - malformed / invalid status file
#   - status == "error" (reports category)
#   - status == "ok" (fresh <= 36h passes, stale > 36h fails)
#   - status == "ok" with missing last_success fails
#   - status == "running" (fresh <= 6h passes, stuck > 6h fails)
#   - status == "running" with missing last_attempt fails
#   - unknown status values fail
#   - failure marker creation and cleanup.
#
# Requires: bash, coreutils.
# Run: scripts/test-backup-health.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECK_SH="$ROOT/scripts/check-backup-health.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-backup-health.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

STATUS_FILE="$TMP/backup-status.json"
MARKER_FILE="$TMP/backup-health.FAILED"
export CHECK_BACKUP_STATUS_FILE="$STATUS_FILE"
export CHECK_BACKUP_FAIL_MARKER="$MARKER_FILE"

run_check() {
  local name="$1" expected_rc="$2" expected_msg="$3"
  shift 3
  local rc=0 out=""
  set +e
  out=$(bash "$CHECK_SH" "$@") 2>&1
  rc=$?
  set -e

  if (( rc == expected_rc )); then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name (expected rc $expected_rc, got $rc)"
    printf '      output: %s\n' "$out" | head -n 5
    return 1
  fi
  if [[ -n "$expected_msg" ]] && ! grep -qF "$expected_msg" <<<"$out"; then
    echo "FAIL: $name — output missing expected message '$expected_msg'"
    printf '      output: %s\n' "$out" | head -n 5
    FAIL=$((FAIL + 1))
  fi
}

# 1. Missing status file -> fails, writes marker
rm -f "$STATUS_FILE" "$MARKER_FILE"
run_check "missing_status_file_fails" 1 "no backup status file"
if [[ -f "$MARKER_FILE" ]]; then
  PASS=$((PASS + 1)); echo "ok:   missing_status_creates_marker"
else
  echo "FAIL: marker file not created on missing status"; FAIL=$((FAIL+1))
fi

# 2. Malformed status file -> fails, writes marker
printf 'this is not json\n' > "$STATUS_FILE"
run_check "malformed_status_file_fails" 1 "status file is unreadable"
[[ -f "$MARKER_FILE" ]] || { echo "FAIL: marker file not created on malformed status"; FAIL=$((FAIL+1)); }

# 3. Status "error" with category -> fails, writes marker
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "error",
  "error_category": "upload_failed",
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-14T12:00:00Z",
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
run_check "error_status_fails" 1 "backup FAILED (error_category=upload_failed"
[[ -f "$MARKER_FILE" ]] || { echo "FAIL: marker file not created on error status"; FAIL=$((FAIL+1)); }

# 4. Status "ok", fresh backup (2 hours old) -> passes, clears marker
export CHECK_BACKUP_NOW="2026-08-15T14:00:00Z"
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "ok",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-15T12:00:00Z",
  "filename": "online-shopping-20260815T120000Z-daily.dump.age",
  "encrypted_size": 1048576,
  "remote_destination_identifier": "remote:backups/online-shopping-20260815T120000Z-daily.dump.age"
}
EOF
run_check "fresh_ok_backup_passes" 0 "healthy: last successful backup"
if [[ ! -f "$MARKER_FILE" ]]; then
  PASS=$((PASS + 1)); echo "ok:   healthy_clears_marker"
else
  echo "FAIL: marker file should be removed on healthy status"; FAIL=$((FAIL+1))
fi

# 5. Status "ok", stale backup (40 hours old > 36h threshold) -> fails, creates marker
export CHECK_BACKUP_NOW="2026-08-17T04:00:00Z"
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "ok",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-15T12:00:00Z",
  "filename": "online-shopping-20260815T120000Z-daily.dump.age",
  "encrypted_size": 1048576,
  "remote_destination_identifier": "remote:backups/online-shopping-20260815T120000Z-daily.dump.age"
}
EOF
run_check "stale_ok_backup_fails" 1 "backup is STALE"
[[ -f "$MARKER_FILE" ]] || { echo "FAIL: marker file not created on stale backup"; FAIL=$((FAIL+1)); }

# 6. Status "ok" with missing / null last_success -> fails
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "ok",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": null,
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
run_check "ok_without_last_success_fails" 1 "last_success is missing/invalid"

# 7. Status "running", fresh (10 minutes in flight) -> passes
export CHECK_BACKUP_NOW="2026-08-15T12:10:00Z"
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "running",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-14T12:00:00Z",
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
run_check "fresh_running_backup_passes" 0 "backup currently running"
[[ ! -f "$MARKER_FILE" ]] || { echo "FAIL: marker file present for fresh running backup"; FAIL=$((FAIL+1)); }

# 8. Status "running", stuck (8 hours in flight > 6h threshold) -> fails
export CHECK_BACKUP_NOW="2026-08-15T20:00:00Z"
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "running",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-14T12:00:00Z",
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
run_check "stuck_running_backup_fails" 1 "backup is STUCK RUNNING"
[[ -f "$MARKER_FILE" ]] || { echo "FAIL: marker file not created for stuck running backup"; FAIL=$((FAIL+1)); }

# 9. Unknown status value -> fails
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "some_alien_state",
  "error_category": null,
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-15T12:00:00Z",
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
run_check "unknown_status_fails" 1 "unknown status value"

# ------------------------------------------------------------------------------------------
# N4: deploy/notify-backup-failure.sh (systemd OnFailure= notifier)
# ------------------------------------------------------------------------------------------
NOTIFY_SH="$ROOT/deploy/notify-backup-failure.sh"
NOTIFY_DIR="$TMP/notify"
mkdir -p "$NOTIFY_DIR"

# 10. No hook configured -> rc 0, marker written with hook=<none>, category from status file,
# and a CRITICAL journal entry is emitted (logger(1) intercepted by a recording stub).
cat > "$STATUS_FILE" <<'EOF'
{
  "status": "error",
  "error_category": "upload_failed",
  "last_attempt": "2026-08-15T12:00:00Z",
  "last_success": "2026-08-14T12:00:00Z",
  "filename": null,
  "encrypted_size": null,
  "remote_destination_identifier": null
}
EOF
mkdir -p "$TMP/bin"
cat > "$TMP/bin/logger" <<'LOGGER'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${LOGGER_LOG:-/nonexistent/logger.log}"
LOGGER
chmod 0750 "$TMP/bin/logger"
rm -f "$NOTIFY_DIR/backup-failure.marker" "$TMP/logger.log"
set +e
PATH="$TMP/bin:$PATH" LOGGER_LOG="$TMP/logger.log" NOTIFY_APP_DIR="$NOTIFY_DIR" NOTIFY_STATUS_FILE="$STATUS_FILE" \
  bash "$NOTIFY_SH" >"$TMP/notify.out" 2>&1
NRC=$?
set -e
if (( NRC == 0 )); then
  PASS=$((PASS + 1)); echo "ok:   notify_no_hook_rc0"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify_no_hook_rc0 (rc $NRC)"; sed 's/^/      /' "$TMP/notify.out" | head -n 5
fi
if [[ -f "$NOTIFY_DIR/backup-failure.marker" ]] && grep -q "category=upload_failed" "$NOTIFY_DIR/backup-failure.marker" \
  && grep -q "hook=<none>" "$NOTIFY_DIR/backup-failure.marker"; then
  PASS=$((PASS + 1)); echo "ok:   notify_marker_written_with_category_and_no_hook"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify marker missing/wrong content"; head -n 5 "$NOTIFY_DIR/backup-failure.marker" 2>/dev/null
fi
if [[ -f "$TMP/logger.log" ]] && grep -q "user.crit" "$TMP/logger.log" \
  && grep -q "online-shopping backup failure" "$TMP/logger.log"; then
  PASS=$((PASS + 1)); echo "ok:   notify_critical_journal_entry_emitted"
else
  FAIL=$((FAIL + 1)); echo "FAIL: logger(1) not invoked with the CRITICAL message: '$(cat "$TMP/logger.log" 2>/dev/null)'"
fi

# 11. Hook configured via env (test override) -> called with `backup_failed <status-file> <category>`
cat > "$NOTIFY_DIR/fake-hook.sh" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" > "$FAKE_HOOK_LOG"
exit 0
EOF
chmod 0750 "$NOTIFY_DIR/fake-hook.sh"
: > "$NOTIFY_DIR/hook.log"
set +e
NOTIFY_APP_DIR="$NOTIFY_DIR" NOTIFY_STATUS_FILE="$STATUS_FILE" NOTIFY_HOOK="$NOTIFY_DIR/fake-hook.sh" \
  FAKE_HOOK_LOG="$NOTIFY_DIR/hook.log" bash "$NOTIFY_SH" >"$TMP/notify.out" 2>&1
NRC=$?
set -e
if (( NRC == 0 )); then
  PASS=$((PASS + 1)); echo "ok:   notify_hook_rc0"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify_hook_rc0 (rc $NRC)"; sed 's/^/      /' "$TMP/notify.out" | head -n 5
fi
if [[ "$(cat "$NOTIFY_DIR/hook.log" 2>/dev/null || true)" == "backup_failed $STATUS_FILE upload_failed" ]]; then
  PASS=$((PASS + 1)); echo "ok:   notify_hook_called_with_expected_args"
else
  FAIL=$((FAIL + 1)); echo "FAIL: hook args wrong: '$(cat "$NOTIFY_DIR/hook.log" 2>/dev/null)'"
fi
if grep -q "hook=$NOTIFY_DIR/fake-hook.sh" "$NOTIFY_DIR/backup-failure.marker"; then
  PASS=$((PASS + 1)); echo "ok:   notify_marker_records_configured_hook"
else
  FAIL=$((FAIL + 1)); echo "FAIL: marker does not record the configured hook"
fi

# 12. Hook configured via backup.env (strict parser) -> used without env override
mkdir -p "$NOTIFY_DIR/env"
cat > "$NOTIFY_DIR/env/backup.env" <<EOF
BACKUP_AGE_RECIPIENT=age1recipient
BACKUP_NOTIFY_HOOK=$NOTIFY_DIR/fake-hook.sh
EOF
chmod 0600 "$NOTIFY_DIR/env/backup.env"
set +e
NOTIFY_APP_DIR="$NOTIFY_DIR/env" NOTIFY_STATUS_FILE="$STATUS_FILE" \
  FAKE_HOOK_LOG="$NOTIFY_DIR/hook.log" bash "$NOTIFY_SH" >"$TMP/notify.out" 2>&1
NRC=$?
set -e
if (( NRC == 0 )) && [[ "$(cat "$NOTIFY_DIR/hook.log" 2>/dev/null || true)" == "backup_failed $STATUS_FILE upload_failed" ]]; then
  PASS=$((PASS + 1)); echo "ok:   notify_hook_from_env_file"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify_hook_from_env_file (rc $NRC, log '$(cat "$NOTIFY_DIR/hook.log" 2>/dev/null)')"
fi
rm -f "$NOTIFY_DIR/env/backup-failure.marker"

# 13. Hook configured but NOT executable -> rc 1, marker still written
set +e
NOTIFY_APP_DIR="$NOTIFY_DIR" NOTIFY_STATUS_FILE="$STATUS_FILE" NOTIFY_HOOK="$NOTIFY_DIR/not-executable.sh" \
  bash "$NOTIFY_SH" >"$TMP/notify.out" 2>&1
NRC=$?
set -e
if (( NRC == 1 )); then
  PASS=$((PASS + 1)); echo "ok:   notify_nonexec_hook_fails_rc1"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify_nonexec_hook_fails_rc1 (rc $NRC)"
fi
if grep -q "not executable" "$TMP/notify.out"; then
  PASS=$((PASS + 1)); echo "ok:   notify_nonexec_hook_reports_reason"
else
  FAIL=$((FAIL + 1)); echo "FAIL: notify_nonexec_hook_reports_reason missing"
fi
if [[ -f "$NOTIFY_DIR/backup-failure.marker" ]]; then
  PASS=$((PASS + 1)); echo "ok:   notify_marker_written_even_on_hook_failure"
else
  FAIL=$((FAIL + 1)); echo "FAIL: marker missing on hook failure"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-BACKUP-HEALTH: FAIL"
  exit 1
fi
echo "TEST-BACKUP-HEALTH: PASS"
exit 0
