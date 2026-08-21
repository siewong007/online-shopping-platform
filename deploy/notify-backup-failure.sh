#!/usr/bin/env bash
#
# Operator-visible failure notification for the online-shopping encrypted backups (N4).
#
# Started by systemd via OnFailure= from online-shopping-backup.service and
# online-shopping-backup-health.service (-> online-shopping-backup-notify.service). It:
#
#   1. always writes a PERSISTENT failure marker ($NOTIFY_APP_DIR/backup-failure.marker, mode
#      0600) with the reason, the status file path and a timestamp — the marker survives reboots
#      and is the anchor of the documented staff check (see docs/backup-restore-runbook.md),
#   2. always emits a CRITICAL journal entry (logger -p user.crit), so `journalctl -p crit`
#      surfaces the failure,
#   3. if BACKUP_NOTIFY_HOOK is configured in /opt/online-shopping/backup.env (root, mode 0600),
#      executes it as:  <hook> backup_failed <status-file> <error-category-or-none>.
#      The hook is the operator's OWN channel (mail, ntfy, PagerDuty, ...). Without a configured
#      hook NO external notification is claimed: the marker and the CRIT journal entry are the
#      actionable signal.
#
# The backup.env is read by the STRICT parser (never `source`d as shell code), and only when the
# hook was not already provided via the NOTIFY_HOOK environment (test override).
#
# Env overrides (for tests): NOTIFY_APP_DIR, NOTIFY_STATUS_FILE, NOTIFY_MARKER, NOTIFY_HOOK.
set -Eeuo pipefail

NOTIFY_APP_DIR="${NOTIFY_APP_DIR:-/opt/online-shopping}"
NOTIFY_STATUS_FILE="${NOTIFY_STATUS_FILE:-$NOTIFY_APP_DIR/backup-status.json}"
NOTIFY_MARKER="${NOTIFY_MARKER:-$NOTIFY_APP_DIR/backup-failure.marker}"
NOTIFY_HOOK="${NOTIFY_HOOK:-}"

if [[ -z "$NOTIFY_HOOK" && -r "$NOTIFY_APP_DIR/backup.env" ]]; then
  # The strict parser is a release component installed next to this script.
  # shellcheck disable=SC1090,SC1091
  if source "$(dirname "${BASH_SOURCE[0]}")/backup-env-parser.sh" 2>/dev/null \
    && command -v parse_backup_env >/dev/null 2>&1; then
    parse_backup_env "$NOTIFY_APP_DIR/backup.env" 2>/dev/null || true
    NOTIFY_HOOK="${BACKUP_NOTIFY_HOOK:-}"
  fi
fi

category=""
if [[ -r "$NOTIFY_STATUS_FILE" ]]; then
  category=$(sed -n 's/.*"error_category"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$NOTIFY_STATUS_FILE" | head -n 1)
fi
[[ -n "$category" ]] || category="backup-service-failed"
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

install -d -m 0750 "$NOTIFY_APP_DIR"
printf 'notified_at=%s\ncategory=%s\nstatus_file=%s\nhook=%s\n' \
  "$ts" "$category" "$NOTIFY_STATUS_FILE" "${NOTIFY_HOOK:-<none>}" > "$NOTIFY_MARKER"
chmod 0600 "$NOTIFY_MARKER"

if command -v logger >/dev/null 2>&1; then
  logger -p user.crit --id=$$ "online-shopping backup failure (category=$category); marker: $NOTIFY_MARKER; see $NOTIFY_STATUS_FILE"
else
  printf 'CRIT: online-shopping backup failure (category=%s); marker: %s\n' "$category" "$NOTIFY_MARKER" >&2
fi

if [[ -n "$NOTIFY_HOOK" ]]; then
  if [[ -x "$NOTIFY_HOOK" ]]; then
    "$NOTIFY_HOOK" backup_failed "$NOTIFY_STATUS_FILE" "$category" \
      || { printf 'notify-backup-failure: BACKUP_NOTIFY_HOOK exited nonzero: %s\n' "$NOTIFY_HOOK" >&2; exit 1; }
  else
    printf 'notify-backup-failure: BACKUP_NOTIFY_HOOK is not executable: %s\n' "$NOTIFY_HOOK" >&2
    exit 1
  fi
fi

exit 0