#!/usr/bin/env bash
#
# Minimal, actionable backup-health consumer for the online-shopping encrypted backups.
#
# Backed by a systemd timer (online-shopping-backup-health.timer), this script inspects the
# machine-readable status file written by backup.sh and exits nonzero (unhealthy) when the backup
# is NOT in a state a human or monitor can act on:
#
#   - the status file is missing or unreadable          -> "no status file"
#   - status == "error"                                 -> reports error_category
#   - status == "ok" but last_success is older than
#     CHECK_BACKUP_STALE_SECONDS (default 36h)          -> "stale backup"
#   - status == "running" for longer than
#     CHECK_BACKUP_RUNNING_STALE_SECONDS (default 6h)   -> "backup stuck / running too long"
#   - any other status value                            -> "unknown status"
#
# It is deliberately small and dependency-free (GNU date + sed). On failure it writes a marker file
# (CHECK_BACKUP_FAIL_MARKER, default <status_dir>/backup-health.FAILED) containing the reason, and
# removes that marker on success — the actionable failure signal a systemd OnFailure unit, cron or
# external monitor can key off.
#
# Safe to run manually:
#   /opt/online-shopping/check-backup-health.sh && echo healthy || echo UNHEALTHY
#
# Env overrides (for tests): CHECK_BACKUP_STATUS_FILE, CHECK_BACKUP_STALE_SECONDS,
# CHECK_BACKUP_RUNNING_STALE_SECONDS, CHECK_BACKUP_FAIL_MARKER, CHECK_BACKUP_NOW.
set -Eeuo pipefail

STATUS_FILE="${CHECK_BACKUP_STATUS_FILE:-/opt/online-shopping/backup-status.json}"
STALE_SECONDS="${CHECK_BACKUP_STALE_SECONDS:-129600}"                 # 36 hours
RUNNING_STALE_SECONDS="${CHECK_BACKUP_RUNNING_STALE_SECONDS:-21600}"   # 6 hours
NOW="${CHECK_BACKUP_NOW:-}"

emit() { printf '[online-shopping-backup-health] %s\n' "$*"; }

epoch_of() {
  # $1 ISO timestamp like 2026-08-13T07:22:26Z; empty/invalid prints nothing and returns 1.
  [[ -n "$1" ]] || return 1
  local ts="$1"
  [[ "$ts" == *Z ]] && ts="${ts%Z}"
  date -u -d "$ts" +%s 2>/dev/null
}

now_epoch() {
  if [[ -n "$NOW" ]]; then
    epoch_of "$NOW" || { emit "ERROR: CHECK_BACKUP_NOW is not a valid ISO timestamp: $NOW"; exit 1; }
  else
    date -u +%s
  fi
}

mark() {
  local verdict="$1"; shift
  local reason="$*" marker sdir
  sdir="${STATUS_FILE%/*}"
  [[ "$sdir" == "$STATUS_FILE" ]] && sdir="."
  marker="${CHECK_BACKUP_FAIL_MARKER:-$sdir/backup-health.FAILED}"
  if [[ "$verdict" == "fail" ]]; then
    printf '%s\n' "$reason" > "$marker"
  else
    rm -f "$marker"
  fi
}

die_unhealthy() {
  emit "UNHEALTHY: $*"
  mark fail "$*"
  exit 1
}

ok() {
  emit "healthy: $*"
  mark ok "$*"
  exit 0
}

[[ -r "$STATUS_FILE" ]] || die_unhealthy "no backup status file at $STATUS_FILE (has backup.sh ever run?)"

status=$(sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATUS_FILE" | head -n 1)
category=$(sed -n 's/.*"error_category"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATUS_FILE" | head -n 1)
last_success=$(sed -n 's/.*"last_success"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATUS_FILE" | head -n 1)
last_attempt=$(sed -n 's/.*"last_attempt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATUS_FILE" | head -n 1)

[[ -n "$status" ]] || die_unhealthy "status file is unreadable or malformed: $STATUS_FILE"
now=$(now_epoch)

case "$status" in
  ok)
    success_epoch=$(epoch_of "$last_success") || success_epoch=""
    if [[ -z "$success_epoch" ]]; then
      die_unhealthy "status is ok but last_success is missing/invalid in $STATUS_FILE"
    fi
    age=$(( now - success_epoch ))
    if (( age > STALE_SECONDS )); then
      die_unhealthy "backup is STALE: last successful backup was $age seconds ago (threshold ${STALE_SECONDS}s; last_success=$last_success)"
    fi
    ok "last successful backup $last_success ($age seconds ago)"
    ;;
  running)
    attempt_epoch=$(epoch_of "$last_attempt") || attempt_epoch=""
    if [[ -z "$attempt_epoch" ]]; then
      die_unhealthy "status is running but last_attempt is missing/invalid in $STATUS_FILE"
    fi
    age=$(( now - attempt_epoch ))
    if (( age > RUNNING_STALE_SECONDS )); then
      die_unhealthy "backup is STUCK RUNNING: in progress for $age seconds (threshold ${RUNNING_STALE_SECONDS}s; last_attempt=$last_attempt)"
    fi
    ok "backup currently running (started $last_attempt, $age seconds ago)"
    ;;
  error)
    die_unhealthy "backup FAILED (error_category=${category:-unknown}; last_attempt=$last_attempt; last_success=$last_success)"
    ;;
  *)
    die_unhealthy "unknown status value in $STATUS_FILE: $status"
    ;;
esac