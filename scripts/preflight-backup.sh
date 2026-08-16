#!/usr/bin/env bash
#
# Host readiness preflight for the encrypted off-server backup pipeline (H6).
#
# Run BEFORE the first production deployment (or any time the host changes) to prove the host can
# actually produce and upload an encrypted backup, without touching any production data:
#
#   sudo /opt/online-shopping/preflight-backup.sh
#   sudo /opt/online-shopping/preflight-backup.sh --fix      # (optional) install missing tools
#
# Checks (FAIL CLOSED: the preflight exits nonzero unless EVERYTHING passes):
#   1. age, rclone and docker are installed and executable.
#   2. $BACKUP_CONFIG_FILE exists, is owned by root and has mode 0600 (M4).
#   3. The file parses with the strict parser and supplies BACKUP_AGE_RECIPIENT,
#      BACKUP_RCLONE_REMOTE and BACKUP_RCLONE_PATH.
#   4. The age recipient looks like a valid age1... recipient.
#   5. The rclone remote resolves (rclone listremotes sees it) and the configured destination path
#      is reachable (rclone lsf succeeds). No objects are created or deleted by the preflight.
#   6. The local backup directory is writable and has free space for at least one archive.
#   7. The database container is present and running (docker inspect) and pg_dump is reachable.
#
# This script performs NO writes to the database, remote or application state. It is the
# documented bootstrap check for the pre-deploy fail-closed path; it never weakens that path.
#
# Env overrides (for tests): PREFLIGHT_CONFIG_FILE, PREFLIGHT_LOCAL_DIR, PREFLIGHT_RCLONE_CONF,
# PREFLIGHT_DB_CONTAINER, PREFLIGHT_DB_USER, PREFLIGHT_DB_NAME.
set -Eeuo pipefail

PREFLIGHT_APP_DIR="${PREFLIGHT_APP_DIR:-/opt/online-shopping}"
PREFLIGHT_CONFIG_FILE="${PREFLIGHT_CONFIG_FILE:-$PREFLIGHT_APP_DIR/backup.env}"
PREFLIGHT_LOCAL_DIR="${PREFLIGHT_LOCAL_DIR:-$PREFLIGHT_APP_DIR/backups}"
PREFLIGHT_RCLONE_CONF="${PREFLIGHT_RCLONE_CONF:-/root/.config/rclone/rclone.conf}"
PREFLIGHT_DB_CONTAINER="${PREFLIGHT_DB_CONTAINER:-online-shopping-db}"
PREFLIGHT_DB_USER="${PREFLIGHT_DB_USER:-shop_admin}"
PREFLIGHT_DB_NAME="${PREFLIGHT_DB_NAME:-online_shopping}"

# The strict parser is a release component: resolve it from next to this script (installed runtime
# layout), from the installed APP_DIR, or from the repo's deploy/ directory (repo-run layout).
# N-C1: if it cannot be resolved, the preflight fails loudly rather than checking with no parser.
# shellcheck disable=SC1090,SC1091
if ! source "$(dirname "${BASH_SOURCE[0]}")/backup-env-parser.sh" 2>/dev/null \
  && ! source "$PREFLIGHT_APP_DIR/backup-env-parser.sh" 2>/dev/null \
  && ! source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)/deploy/backup-env-parser.sh" 2>/dev/null; then
  echo "PREFLIGHT: ERROR: backup-env-parser.sh not found (not next to this script, in APP_DIR, or in deploy/)" >&2
  exit 1
fi
if ! command -v parse_backup_env >/dev/null 2>&1; then
  echo "PREFLIGHT: ERROR: backup-env-parser.sh failed to load (parse_backup_env not defined)" >&2
  exit 1
fi

FAILED=0
note() { printf '  [check] %s\n' "$*"; }
ok()   { printf '  [PASS] %s\n' "$*"; }
bad()  { printf '  [FAIL] %s\n' "$*" >&2; FAILED=1; }

echo "== online-shopping backup host readiness preflight =="

note "tools present"
for tool in age rclone docker sha256sum flock df stat; do
  if command -v "$tool" >/dev/null 2>&1; then
    ok "$tool: $(command -v "$tool")"
  else
    bad "$tool is not installed (apt-get install -y $tool)"
  fi
done

note "backup config file security (M4)"
if [[ -f "$PREFLIGHT_CONFIG_FILE" ]]; then
  if parse_backup_env "$PREFLIGHT_CONFIG_FILE" enforce_perms; then
    ok "config parses strictly (root-owned, mode 0600)"
  else
    bad "config failed the strict parse / permission check"
  fi
else
  bad "missing config file: $PREFLIGHT_CONFIG_FILE"
fi

note "required configuration values"
for key in BACKUP_AGE_RECIPIENT BACKUP_RCLONE_REMOTE BACKUP_RCLONE_PATH; do
  if [[ -n "${!key:-}" ]]; then
    ok "$key is set"
  else
    bad "$key is not set"
  fi
done

if [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]]; then
  if [[ "$BACKUP_AGE_RECIPIENT" == age1* ]]; then
    ok "recipient looks like a valid age recipient"
  else
    bad "BACKUP_AGE_RECIPIENT does not start with age1"
  fi
fi

note "rclone remote reachable"
if [[ -n "${BACKUP_RCLONE_REMOTE:-}" ]]; then
  if [[ -f "$PREFLIGHT_RCLONE_CONF" || -n "${RCLONE_CONFIG:-}" ]]; then
    if rclone listremotes 2>/dev/null | grep -Fqx "$BACKUP_RCLONE_REMOTE:"; then
      ok "remote $BACKUP_RCLONE_REMOTE configured"
    else
      bad "rclone remote $BACKUP_RCLONE_REMOTE is not configured (check $PREFLIGHT_RCLONE_CONF)"
    fi
    if [[ -n "${BACKUP_RCLONE_PATH:-}" ]] \
      && rclone lsf --contimeout 15s --timeout 120s "$BACKUP_RCLONE_REMOTE:${BACKUP_RCLONE_PATH}/" >/dev/null 2>&1; then
      ok "destination ${BACKUP_RCLONE_REMOTE}:${BACKUP_RCLONE_PATH} reachable"
    else
      bad "destination ${BACKUP_RCLONE_REMOTE}:${BACKUP_RCLONE_PATH} not reachable"
    fi
  else
    bad "rclone config not found: $PREFLIGHT_RCLONE_CONF"
  fi
fi

note "local backup directory"
install -d -m 0700 "$PREFLIGHT_LOCAL_DIR" 2>/dev/null || { bad "cannot create $PREFLIGHT_LOCAL_DIR"; }
if [[ -d "$PREFLIGHT_LOCAL_DIR" && -w "$PREFLIGHT_LOCAL_DIR" ]]; then
  ok "local dir writable"
  avail=$(df --output=avail -B1 "$PREFLIGHT_LOCAL_DIR" 2>/dev/null | tail -n 1 | tr -d ' ')
  if [[ "$avail" =~ ^[0-9]+$ && "$avail" -gt 1073741824 ]]; then
    ok "free space: $(( avail / 1048576 )) MiB (>= 1 GiB)"
  else
    bad "free space below 1 GiB on $PREFLIGHT_LOCAL_DIR"
  fi
else
  bad "local backup dir not writable: $PREFLIGHT_LOCAL_DIR"
fi

note "database container reachable"
running=$(docker inspect --format '{{.State.Running}}' "$PREFLIGHT_DB_CONTAINER" 2>/dev/null || true)
if [[ "$running" == "true" ]]; then
  ok "container $PREFLIGHT_DB_CONTAINER running"
  if docker exec "$PREFLIGHT_DB_CONTAINER" pg_dump --version >/dev/null 2>&1; then
    ok "pg_dump reachable inside $PREFLIGHT_DB_CONTAINER"
  else
    bad "pg_dump not reachable inside $PREFLIGHT_DB_CONTAINER"
  fi
else
  bad "container $PREFLIGHT_DB_CONTAINER is not running (or docker is unreachable)"
fi

echo
if (( FAILED != 0 )); then
  echo "PREFLIGHT: FAIL — the host is NOT ready for encrypted off-server backups" >&2
  exit 1
fi
echo "PREFLIGHT: PASS — the host is ready for encrypted off-server backups"
exit 0