#!/usr/bin/env bash
#
# Encrypted, off-server PostgreSQL backup for the online-shopping stack.
#
# - dumps the configured database with pg_dump (custom format),
# - streams it straight through age so a plaintext dump never touches disk,
# - uploads the encrypted archive to an rclone destination,
# - verifies the upload by re-listing the remote object (byte size) AND an MD5 hash of the
#   remote object compared to the local file,
# - prunes local and remote archives by configured retention (deterministic: ordered by the
#   ISO timestamp embedded in the archive name, never by file mtime),
# - records a machine-readable status file and returns nonzero on any material failure.
#
# Runtime configuration is loaded with the strict parser in deploy/backup-env-parser.sh (no
# `source`, no shell evaluation) from $BACKUP_CONFIG_FILE (root-owned, mode 0600, outside Git).
# See deploy/backup.env.example for the safe template.
#
# Failure semantics:
#   - the status file is written to "running" the moment the lock is acquired, so an
#     interrupted/failed/crashed job can never leave a stale "ok";
#   - a caught signal (INT/TERM/HUP) records category "interrupted";
#   - an unexpected error records category "unexpected_error" unless a more specific category
#     was already recorded;
#   - SIGKILL leaves the status at "running", which is deliberately NOT "ok".
#
# Safe to run manually as root:
#   /opt/online-shopping/backup.sh
set -Eeuo pipefail

readonly APP_DIR="${BACKUP_APP_DIR:-/opt/online-shopping}"
readonly BACKUP_CONFIG_FILE="${BACKUP_CONFIG_FILE:-$APP_DIR/backup.env}"
readonly LOCK_FILE="${BACKUP_LOCK_FILE:-$APP_DIR/backup.lock}"
readonly STATUS_FILE="${BACKUP_STATUS_FILE:-$APP_DIR/backup-status.json}"

STAGEDIR=""
# Last status written by write_status: "running" | "ok" | "error". Used by the ERR/signal traps
# to decide whether a final category was already recorded (a final ok/error is never clobbered,
# but a "running" marker is always replaced by the concrete failure).
STATUS_LAST=""

# Populated by validate_config once the timeouts are known; used to bound every rclone call.
RTIMEOUT=()

# shellcheck disable=SC1091
source "$(dirname "${BASH_SOURCE[0]}")/backup-env-parser.sh"

log() { printf '[online-shopping-backup] %s\n' "$*"; }
warn() { printf '[online-shopping-backup] WARNING: %s\n' "$*" >&2; }

fail() {
  local category="${1:-unknown}" message="${2:-backup failed}"
  log "ERROR [$category] $message"
  write_status "error" "$category" "" "" ""
  exit 1
}

json_str() {
  local value="${1:-}"
  if [[ -z "$value" ]]; then
    printf 'null'
  else
    value="${value//\"/\\\"}"
    printf '"%s"' "$value"
  fi
}

json_size() {
  local value="${1:-}"
  if [[ -z "$value" || ! "$value" =~ ^[0-9]+$ ]]; then
    printf 'null'
  else
    printf '%s' "$value"
  fi
}

write_status() {
  local status="$1" category="${2:-}" filename="${3:-}" size="${4:-}" remote_id="${5:-}"
  local sdir now attempt last_success tmp
  STATUS_LAST="$status"
  sdir="${STATUS_FILE%/*}"
  [[ "$sdir" == "$STATUS_FILE" ]] && sdir="."
  install -d -m 0750 "$sdir"

  now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  attempt="$now"
  last_success="null"
  if [[ -f "$STATUS_FILE" ]]; then
    last_success=$(sed -n 's/.*"last_success"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$STATUS_FILE" | head -n 1)
    [[ -n "$last_success" ]] || last_success="null"
  fi
  [[ "$status" == "ok" ]] && last_success="$now"

  tmp=$(mktemp "$sdir/.backup-status.XXXXXX")
  {
    printf '{\n'
    printf '  "status": %s,\n'                   "$(json_str "$status")"
    printf '  "error_category": %s,\n'           "$(json_str "$category")"
    printf '  "last_attempt": %s,\n'             "$(json_str "$attempt")"
    printf '  "last_success": %s,\n'             "$(json_str "$last_success")"
    printf '  "filename": %s,\n'                 "$(json_str "$filename")"
    printf '  "encrypted_size": %s,\n'           "$(json_size "$size")"
    printf '  "remote_destination_identifier": %s\n' "$(json_str "$remote_id")"
    printf '}\n'
  } > "$tmp"
  chmod 0600 "$tmp"
  mv -f "$tmp" "$STATUS_FILE"
}

acquire_lock() {
  install -d -m 0750 "$APP_DIR"
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    log "ERROR [already_running] another backup is already running (lock: $LOCK_FILE)"
    # The in-flight run owns the status file; do not clobber it here.
    exit 1
  fi
  # From here on this run owns the status file. Record "running" immediately so an abnormal
  # exit can never leave a stale "ok" (H1).
  write_status "running" "" "" "" ""
}

load_config() {
  if [[ ! -r "$BACKUP_CONFIG_FILE" ]]; then
    fail "config" "runtime configuration not found or not readable: $BACKUP_CONFIG_FILE"
  fi
  parse_backup_env "$BACKUP_CONFIG_FILE" enforce_perms \
    || fail "config" "failed to parse $BACKUP_CONFIG_FILE (strict KEY=VALUE parser; no shell evaluation)"
}

validate_config() {
  local missing=0 key
  for key in BACKUP_AGE_RECIPIENT BACKUP_RCLONE_REMOTE BACKUP_RCLONE_PATH; do
    if [[ -z "${!key:-}" ]]; then
      warn "missing required configuration: $key"
      missing=1
    fi
  done
  if (( missing != 0 )); then
    fail "config" "encrypted off-server backup is not configured; refusing to fall back to a local-only or unencrypted backup"
  fi

  : "${BACKUP_LOCAL_DIR:=$APP_DIR/backups}"
  : "${BACKUP_LOCAL_RETENTION_COUNT:=3}"
  : "${BACKUP_REMOTE_DAILY_RETENTION:=14}"
  : "${BACKUP_REMOTE_WEEKLY_RETENTION:=8}"
  : "${BACKUP_WEEKLY_DAY:=7}"
  : "${BACKUP_RCLONE_CONTIMEOUT:=15s}"
  : "${BACKUP_RCLONE_TIMEOUT:=120s}"
  : "${BACKUP_DB_CONTAINER:=online-shopping-db}"
  : "${BACKUP_DB_USER:=shop_admin}"
  : "${BACKUP_DB_NAME:=online_shopping}"

  local value
  for key in BACKUP_LOCAL_RETENTION_COUNT BACKUP_REMOTE_DAILY_RETENTION BACKUP_REMOTE_WEEKLY_RETENTION; do
    value="${!key}"
    [[ "$value" =~ ^[0-9]+$ && "$value" -ge 1 ]] || fail "config" "$key must be a positive integer (got: $value)"
  done
  [[ "${BACKUP_WEEKLY_DAY}" =~ ^[1-7]$ ]] || fail "config" "BACKUP_WEEKLY_DAY must be 1 (Mon)..7 (Sun)"

  RTIMEOUT=()
  [[ -n "${BACKUP_RCLONE_CONTIMEOUT:-}" ]] && RTIMEOUT+=(--contimeout "$BACKUP_RCLONE_CONTIMEOUT")
  [[ -n "${BACKUP_RCLONE_TIMEOUT:-}" ]] && RTIMEOUT+=(--timeout "$BACKUP_RCLONE_TIMEOUT")

  # Destination scope guard: a malformed or empty path must never let rclone act outside the
  # configured backup prefix. Deletion is additionally limited to exact objects that a listing
  # under this path returned, so the scope cannot widen at delete time.
  case "$BACKUP_RCLONE_PATH" in
    ""|"/")        fail "config" "BACKUP_RCLONE_PATH must be a non-empty, non-root destination path" ;;
    *" "*|*$'\t'*) fail "config" "BACKUP_RCLONE_PATH must not contain whitespace" ;;
    *".."*|*"\\"*) fail "config" "BACKUP_RCLONE_PATH must not contain '..' or backslashes" ;;
  esac

  install -d -m 0700 "$BACKUP_LOCAL_DIR"
}

verify_deps() {
  local tool
  for tool in docker age rclone; do
    command -v "$tool" >/dev/null 2>&1 || fail "deps" "required tool not found: $tool"
  done
}

verify_db_running() {
  local running
  running=$(docker inspect --format '{{.State.Running}}' "$BACKUP_DB_CONTAINER" 2>/dev/null || true)
  [[ "$running" == "true" ]] || fail "db_unavailable" "database container $BACKUP_DB_CONTAINER is not running"
}

encrypt_dump() {
  # $1 = output path. Streams pg_dump through age so a plaintext dump is never written to disk.
  # PIPESTATUS distinguishes a dump failure from an encryption failure; pipefail alone could not
  # report which stage produced the truncated stream.
  local out="$1"
  local -a dump_env=() pipeline_status
  # M3: the database password travels through the docker exec environment, never argv.
  if [[ -n "${BACKUP_DB_PASSWORD:-}" ]]; then
    dump_env=(-e "PGPASSWORD=$BACKUP_DB_PASSWORD")
  fi
  # PIPESTATUS distinguishes a dump failure from an encryption failure, but the failing stage
  # would otherwise trip the ERR trap (which fires even inside `set +e`), mislabelling the run
  # as unexpected_error. Suppress the trap for the pipeline and classify from PIPESTATUS below.
  set +e
  trap - ERR
  docker exec "${dump_env[@]}" "$BACKUP_DB_CONTAINER" pg_dump --format=custom --no-owner --no-acl \
    -U "$BACKUP_DB_USER" "$BACKUP_DB_NAME" \
    | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$out"
  pipeline_status=("${PIPESTATUS[@]}")
  trap on_error ERR
  set -e
  if (( pipeline_status[1] != 0 )); then
    fail "encrypt_failed" "age encryption failed (exit ${pipeline_status[1]})"
  fi
  if (( pipeline_status[0] != 0 )); then
    fail "dump_failed" "pg_dump failed (exit ${pipeline_status[0]})"
  fi
}

verify_remote() {
  # $1 = local encrypted file, $2 = rclone destination (no trailing slash). Returns 0 iff the
  # remote object exists with the same byte size AND the same MD5 as the local file (M2: size
  # alone is not a strong integrity signal).
  local file="$1" dest="$2" name size listed local_md5 remote_md5
  name=$(basename "$file")
  size=$(stat -c %s "$file")
  listed=$(rclone lsf "${RTIMEOUT[@]}" --files-only --format "sp" --separator "$(printf '\t')" "$dest/" 2>/dev/null \
            | awk -F '\t' -v n="$name" '$2 == n { print $1 }' | head -n 1)
  [[ -n "$listed" && "$listed" == "$size" ]] || return 1

  local_md5=$(md5sum "$file" | awk '{print $1}')
  remote_md5=$(rclone hashsum MD5 "${RTIMEOUT[@]}" "$dest/$name" 2>/dev/null | awk '{print $1}' | head -n 1)
  [[ -n "$remote_md5" && "$remote_md5" == "$local_md5" ]]
}

local_retention() {
  # M5: retention is ordered by the ISO timestamp embedded in the archive name (YYYYMMDDTHHMMSSZ
  # sorts lexically and chronologically), never by mtime, so results are deterministic.
  local files=() index
  mapfile -t files < <(find "$BACKUP_LOCAL_DIR" -maxdepth 1 -type f \
    -name 'online-shopping-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z-*.dump.age' \
    -printf '%f\n' | sort -r)
  for ((index = BACKUP_LOCAL_RETENTION_COUNT; index < ${#files[@]}; index++)); do
    rm -f -- "$BACKUP_LOCAL_DIR/${files[$index]}"
    log "pruned local backup ${files[$index]}"
  done
}

prune_tier() {
  # $1 = destination, $2 = tier (daily|weekly), $3 = copies to keep. Only objects that the rclone
  # listing actually returned and that match the backup name pattern are deleted, each by exact
  # name under the configured destination. Scope can never escape the backup prefix. Retention is
  # deterministic: names sort lexically, so the oldest (lowest ISO timestamp) are pruned first.
  local dest="$1" tier="$2" keep="$3"
  local names=() name count excess i
  while IFS= read -r name; do
    [[ "$name" == "online-shopping-"*"-$tier.dump.age" ]] && names+=("$name")
  done < <(rclone lsf "${RTIMEOUT[@]}" --files-only "$dest/" 2>/dev/null | sort)
  count=${#names[@]}
  (( count > keep )) || return 0
  excess=$(( count - keep ))
  for ((i = 0; i < excess; i++)); do
    name="${names[$i]}"
    if rclone delete "${RTIMEOUT[@]}" "$dest/$name" >/dev/null 2>&1; then
      log "pruned remote $tier backup $name"
    else
      warn "failed to prune remote $tier backup $name"
    fi
  done
}

remote_retention() {
  local dest="$1"
  prune_tier "$dest" daily "${BACKUP_REMOTE_DAILY_RETENTION}"
  prune_tier "$dest" weekly "${BACKUP_REMOTE_WEEKLY_RETENTION}"
}

on_exit() {
  if [[ -n "$STAGEDIR" && -d "$STAGEDIR" ]]; then
    rm -rf -- "$STAGEDIR"
  fi
}

interrupt_handler() {
  if [[ "$STATUS_LAST" != "ok" && "$STATUS_LAST" != "error" ]]; then
    write_status "error" "interrupted" "" "" ""
  fi
  exit 130
}

on_error() {
  # Unexpected error not already classified by fail(). A final ok/error is never clobbered; a
  # "running" marker is always replaced so an unexpected failure can never look healthy.
  if [[ "$STATUS_LAST" != "ok" && "$STATUS_LAST" != "error" ]]; then
    write_status "error" "unexpected_error" "" "" ""
  fi
  exit 1
}

main() {
  trap on_exit EXIT
  trap on_error ERR
  trap interrupt_handler INT TERM HUP

  acquire_lock
  load_config
  validate_config
  verify_deps
  verify_db_running

  local ts dow tier weekly_day filename final_path dest stage size remote_id
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  dow=$(date -u +%u)
  weekly_day="${BACKUP_WEEKLY_DAY}"
  if [[ "$dow" == "$weekly_day" ]]; then tier="weekly"; else tier="daily"; fi

  filename="online-shopping-${ts}-${tier}.dump.age"
  final_path="$BACKUP_LOCAL_DIR/$filename"
  dest="$BACKUP_RCLONE_REMOTE:$BACKUP_RCLONE_PATH"

  STAGEDIR=$(mktemp -d "$BACKUP_LOCAL_DIR/.backup.XXXXXX")
  chmod 0700 "$STAGEDIR"
  stage="$STAGEDIR/$filename"

  log "creating encrypted backup $filename"
  encrypt_dump "$stage"

  if [[ ! -s "$stage" ]]; then
    fail "encrypt_failed" "encrypted output is empty"
  fi
  if ! head -c 100 "$stage" | grep -q '^age-encryption.org/v1'; then
    fail "encrypt_failed" "encrypted output does not have an age header"
  fi

  chmod 0600 "$stage"
  mv -f "$stage" "$final_path"   # atomic rename: a partial archive can never look complete
  log "encrypted backup ready: $final_path"

  if ! rclone copy "${RTIMEOUT[@]}" "$final_path" "$dest/"; then
    fail "upload_failed" "rclone copy to $dest failed"
  fi
  log "uploaded to $dest"

  if ! verify_remote "$final_path" "$dest"; then
    fail "upload_verify_failed" "remote object for $(basename "$final_path") missing, size mismatch or hash mismatch"
  fi
  log "remote object verified (size + MD5) for $(basename "$final_path")"

  size=$(stat -c %s "$final_path")
  remote_id="$dest/$(basename "$final_path")"

  local_retention
  remote_retention "$dest"

  write_status "ok" "" "$(basename "$final_path")" "$size" "$remote_id"
  log "backup complete: $filename ($size bytes) -> $remote_id"
}

main "$@"