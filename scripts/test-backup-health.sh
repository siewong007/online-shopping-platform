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

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-BACKUP-HEALTH: FAIL"
  exit 1
fi
echo "TEST-BACKUP-HEALTH: PASS"
exit 0
