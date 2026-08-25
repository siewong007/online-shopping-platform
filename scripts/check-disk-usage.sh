#!/usr/bin/env bash
#
# Recurring disk-usage monitor for the online-shopping VPS.
#
# Backed by a systemd timer (online-shopping-disk-usage.timer), this script checks the usage
# percentage of the root filesystem (df -P) and alerts when it is at or above
# DISK_USAGE_THRESHOLD (default 85):
#
#   1. writes/refreshes a persistent alert marker ($DISK_APP_DIR/disk-usage.marker, mode 0600)
#      recording when the alert fired — the anchor of the documented staff check,
#   2. emits a user.warning journal entry, so `journalctl -p warning` surfaces it even with no
#      external channel,
#   3. if BACKUP_NOTIFY_HOOK is configured in /opt/online-shopping/backup.env (root, mode 0600),
#      executes it as:  <hook> disk_usage_high <mountpoint> <usage-percent>.
#      The hook is the operator's OWN channel (mail, ntfy, PagerDuty, ...). Without a configured
#      hook NO external notification is claimed: the marker and the journal entry are the
#      actionable signal.
#
# Alerts are DEDUPLICATED with a marker-file cooldown: while usage stays at/above the threshold,
# the hook call happens at most once every DISK_USAGE_ALERT_COOLDOWN_SECONDS (default 21600 =
# 6 hours); every run still logs the current usage. Dropping back UNDER the threshold removes the
# marker (auto-resolve), so the next crossing alerts immediately again.
#
# Like check-backup-health.sh, a bad condition exits nonzero so the systemd OnFailure=
# online-shopping-backup-notify.service path fires too; that notifier is backup-worded by design
# (it reads backup-status.json), and this script's own marker/journal/hook carry the precise
# disk signal.
#
# The backup.env is read by the STRICT parser (never `source`d as shell code), and only when the
# hook was not already provided via the DISK_HOOK environment (test override).
#
# Safe to run manually:
#   /opt/online-shopping/check-disk-usage.sh && echo ok || echo ALERT
#
# Env overrides (for tests): DISK_APP_DIR, DISK_MARKER, DISK_TARGET, DISK_USAGE_THRESHOLD,
# DISK_USAGE_ALERT_COOLDOWN_SECONDS, DISK_HOOK.
set -Eeuo pipefail

DISK_APP_DIR="${DISK_APP_DIR:-/opt/online-shopping}"
DISK_MARKER="${DISK_MARKER:-$DISK_APP_DIR/disk-usage.marker}"
DISK_TARGET="${DISK_TARGET:-/}"
THRESHOLD="${DISK_USAGE_THRESHOLD:-85}"
COOLDOWN_SECONDS="${DISK_USAGE_ALERT_COOLDOWN_SECONDS:-21600}"   # 6 hours
DISK_HOOK="${DISK_HOOK:-}"

emit() { printf '[online-shopping-disk-usage] %s\n' "$*"; }

if [[ -z "$DISK_HOOK" && -r "$DISK_APP_DIR/backup.env" ]]; then
  # The strict parser is a release component installed next to this script.
  # shellcheck disable=SC1090,SC1091
  if source "$(dirname "${BASH_SOURCE[0]}")/backup-env-parser.sh" 2>/dev/null \
    && command -v parse_backup_env >/dev/null 2>&1; then
    parse_backup_env "$DISK_APP_DIR/backup.env" 2>/dev/null || true
    DISK_HOOK="${BACKUP_NOTIFY_HOOK:-}"
  fi
fi

[[ "$THRESHOLD" =~ ^[0-9]+$ ]] \
  || { emit "ERROR: DISK_USAGE_THRESHOLD must be an integer percentage: $THRESHOLD"; exit 1; }
(( THRESHOLD >= 1 && THRESHOLD <= 100 )) \
  || { emit "ERROR: DISK_USAGE_THRESHOLD must be between 1 and 100: $THRESHOLD"; exit 1; }
[[ "$COOLDOWN_SECONDS" =~ ^[0-9]+$ ]] \
  || { emit "ERROR: DISK_USAGE_ALERT_COOLDOWN_SECONDS must be a non-negative integer: $COOLDOWN_SECONDS"; exit 1; }

usage=$(df -P "$DISK_TARGET" | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')
[[ "$usage" =~ ^[0-9]+$ ]] \
  || { emit "ERROR: could not parse the usage percentage from df -P $DISK_TARGET"; exit 1; }

now=$(date -u +%s)
marker_epoch=""
if [[ -r "$DISK_MARKER" ]]; then
  marker_epoch=$(sed -n 's/^alerted_at_epoch=//p' "$DISK_MARKER" | head -n 1)
fi

if (( usage >= THRESHOLD )); then
  install -d -m 0750 "$DISK_APP_DIR"

  fresh_alert=0
  if [[ -z "$marker_epoch" ]] || ! [[ "$marker_epoch" =~ ^[0-9]+$ ]] \
    || (( now - marker_epoch >= COOLDOWN_SECONDS )); then
    printf 'alerted_at_epoch=%s\nalerted_at=%s\nmountpoint=%s\nusage_pct=%s\nthreshold=%s\n' \
      "$now" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$DISK_TARGET" "$usage" "$THRESHOLD" > "$DISK_MARKER"
    chmod 0600 "$DISK_MARKER"
    fresh_alert=1
  fi

  if command -v logger >/dev/null 2>&1; then
    # The journal entry is best-effort: a logger failure must never abort the alert path.
    logger -p user.warning --id=$$ \
      "online-shopping disk usage ${usage}% on $DISK_TARGET exceeds threshold ${THRESHOLD}%; marker: $DISK_MARKER" \
      || emit "WARNING: disk usage ${usage}% on $DISK_TARGET exceeds threshold ${THRESHOLD}%"
  else
    emit "WARNING: disk usage ${usage}% on $DISK_TARGET exceeds threshold ${THRESHOLD}%"
  fi

  if (( fresh_alert )); then
    emit "ALERT: disk usage ${usage}% on $DISK_TARGET is at/above threshold ${THRESHOLD}%"
    if [[ -n "$DISK_HOOK" ]]; then
      if [[ -x "$DISK_HOOK" ]]; then
        "$DISK_HOOK" disk_usage_high "$DISK_TARGET" "$usage" \
          || { emit "check-disk-usage: BACKUP_NOTIFY_HOOK exited nonzero: $DISK_HOOK" >&2; exit 1; }
      else
        emit "check-disk-usage: BACKUP_NOTIFY_HOOK is not executable: $DISK_HOOK" >&2
        exit 1
      fi
    else
      emit "no BACKUP_NOTIFY_HOOK configured; the marker and the journal entry are the actionable signal"
    fi
  else
    emit "disk usage ${usage}% on $DISK_TARGET remains at/above threshold ${THRESHOLD}%; repeat alert suppressed within the ${COOLDOWN_SECONDS}s cooldown"
  fi
  exit 1
fi

# Auto-resolve: back under threshold clears the marker so the next crossing alerts immediately.
if [[ -f "$DISK_MARKER" ]]; then
  rm -f -- "$DISK_MARKER"
  emit "resolved: disk usage back under threshold (${usage}% on $DISK_TARGET < ${THRESHOLD}%); marker cleared"
fi
emit "healthy: disk usage on $DISK_TARGET is ${usage}% (threshold ${THRESHOLD}%)"
exit 0
