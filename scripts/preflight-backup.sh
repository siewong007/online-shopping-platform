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

# N5: the capacity rule is SHARED with deploy/backup.sh and restore.sh's pre-restore safety
# snapshot (deploy/backup-capacity.sh), so the preflight verdict and a real backup run can never
# disagree. Resolve it like the parser: repo deploy/, next to this script, or APP_DIR.
# shellcheck disable=SC1090,SC1091
if ! source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd)/deploy/backup-capacity.sh" 2>/dev/null \
  && ! source "$(dirname "${BASH_SOURCE[0]}")/backup-capacity.sh" 2>/dev/null \
  && ! source "$PREFLIGHT_APP_DIR/backup-capacity.sh" 2>/dev/null; then
  echo "PREFLIGHT: ERROR: backup-capacity.sh not found (not in deploy/, next to this script, or in APP_DIR)" >&2
  exit 1
fi
if ! command -v estimate_backup_unit >/dev/null 2>&1 || ! command -v required_backup_space >/dev/null 2>&1; then
  echo "PREFLIGHT: ERROR: backup-capacity.sh failed to load (capacity functions not defined)" >&2
  exit 1
fi

FAILED=0
note() { printf '  [check] %s\n' "$*"; }
ok()   { printf '  [PASS] %s\n' "$*"; }
bad()  { printf '  [FAIL] %s\n' "$*" >&2; FAILED=1; }

echo "== online-shopping backup host readiness preflight =="

note "tools present"
for tool in age age-keygen rclone docker sha256sum flock df stat; do
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
  # N5: the SAME shared capacity rule as a real backup run (deploy/backup-capacity.sh): the
  # requirement is estimate_unit * (retention + 2) + 512 MiB with estimate_unit = max(largest
  # prior local archive, live database size, 100 MiB floor). The preflight must never pass while
  # the backup itself would fail the same check — or fail while the backup would pass.
  # NOTE: no `local` here — this block runs at script top level, not inside a function.
  db_size=""
  size_env=()
  if [[ -n "${BACKUP_DB_PASSWORD:-}" ]]; then
    export PGPASSWORD="$BACKUP_DB_PASSWORD"
    size_env=(-e PGPASSWORD)
  fi
  db_size=$(docker exec "${size_env[@]}" "$PREFLIGHT_DB_CONTAINER" \
      psql -At -v ON_ERROR_STOP=1 -U "$PREFLIGHT_DB_USER" -d "$PREFLIGHT_DB_NAME" \
      -c "SELECT pg_database_size(current_database())" 2>/dev/null | tr -d ' \r' || true)
  [[ "$db_size" =~ ^[0-9]+$ ]] || db_size=""
  prior_unit=$(find "$PREFLIGHT_LOCAL_DIR" -maxdepth 1 -type f -name '*.dump.age' -printf '%s\n' 2>/dev/null | sort -rn | head -n 1 || true)
  [[ "$prior_unit" =~ ^[0-9]+$ ]] || prior_unit=""
  unit=$(estimate_backup_unit "$db_size" "$prior_unit")
  # D1: the local retention count resolves through the SAME shared default/rule as backup.sh
  # (deploy/backup-capacity.sh). The strict parser exports only keys PRESENT in backup.env, so an
  # OMITTED BACKUP_LOCAL_RETENTION_COUNT must NOT be treated as 0 here while backup.sh reads the
  # default of 3 — the preflight would pass below the real requirement. An explicit invalid value
  # must fail here exactly like backup.sh rejects it, never silently diverge.
  if ! retention_count=$(resolve_backup_retention_count); then
    bad "BACKUP_LOCAL_RETENTION_COUNT must be a positive integer (got: ${BACKUP_LOCAL_RETENTION_COUNT:-<unset, shared default $BACKUP_DEFAULT_RETENTION_COUNT>}); backup.sh rejects it the same way"
    retention_count=""
  fi
  if [[ -n "$retention_count" ]]; then
    required=$(required_backup_space "$unit" "$retention_count")
    avail=$(filesystem_avail "$PREFLIGHT_LOCAL_DIR" || true)
    if [[ "$avail" =~ ^[0-9]+$ ]] && (( avail >= required )); then
      ok "free space: $(( avail / 1048576 )) MiB (need >= $(( required / 1048576 )) MiB)"
    else
      bad "free space on $PREFLIGHT_LOCAL_DIR below the shared backup capacity requirement ($(( required / 1048576 )) MiB, have ${avail:-unknown})"
    fi
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