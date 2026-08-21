#!/usr/bin/env bash
#
# Encrypted, off-server PostgreSQL backup for the online-shopping stack.
#
# - dumps the configured database with pg_dump (custom format),
# - streams it straight through age so a plaintext dump never touches disk,
# - uploads the encrypted archive to an rclone destination,
# - verifies the upload provider-independently: the remote object is downloaded back and
#   hashed with SHA-256 locally, and the local SHA-256 is compared with the remote object's
#   bytes (a `.sha256` sidecar is uploaded alongside the archive). No remote-computed hash
#   (S3 multipart ETag, B2 SHA1, etc.) is ever trusted, so this works on every backend,
# - prunes local and remote archives by configured retention (deterministic: ordered by the
#   ISO timestamp embedded in the archive name, never by file mtime),
# - checks available disk space BEFORE staging, so a full filesystem can never be created by
#   a backup run (estimate from prior archive sizes, the live database size, or a floor),
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

# shellcheck disable=SC1091,SC1090
if ! source "$(dirname "${BASH_SOURCE[0]}")/backup-env-parser.sh" 2>/dev/null \
  && ! source "$APP_DIR/backup-env-parser.sh" 2>/dev/null; then
  echo "[online-shopping-backup] ERROR: backup-env-parser.sh is missing next to backup.sh and in $APP_DIR; refusing to continue" >&2
  exit 1
fi
if ! command -v parse_backup_env >/dev/null 2>&1; then
  echo "[online-shopping-backup] ERROR: backup-env-parser.sh failed to load (parse_backup_env not defined); refusing to continue" >&2
  exit 1
fi

# N5: the capacity rule is SHARED with scripts/preflight-backup.sh and restore.sh's pre-restore
# safety snapshot (deploy/backup-capacity.sh), so every component computes the same requirement.
# shellcheck disable=SC1091,SC1090
if ! source "$(dirname "${BASH_SOURCE[0]}")/backup-capacity.sh" 2>/dev/null \
  && ! source "$APP_DIR/backup-capacity.sh" 2>/dev/null; then
  echo "[online-shopping-backup] ERROR: backup-capacity.sh is missing next to backup.sh and in $APP_DIR; refusing to continue" >&2
  exit 1
fi
if ! command -v estimate_backup_unit >/dev/null 2>&1 || ! command -v required_backup_space >/dev/null 2>&1; then
  echo "[online-shopping-backup] ERROR: backup-capacity.sh failed to load (capacity functions not defined); refusing to continue" >&2
  exit 1
fi

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
  local sdir now attempt last_success tmp dur
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
  # N9: the run duration is recorded so the operator can see how long backups take (the
  # production TimeoutStartSec decision must be based on MEASURED durations, see the runbook).
  dur=0
  if (( RUN_START > 0 )); then
    dur=$(( $(date +%s) - RUN_START ))
    [[ "$dur" -ge 0 ]] || dur=0
  fi

  tmp=$(mktemp "$sdir/.backup-status.XXXXXX")
  {
    printf '{\n'
    printf '  "status": %s,\n'                   "$(json_str "$status")"
    printf '  "error_category": %s,\n'           "$(json_str "$category")"
    printf '  "last_attempt": %s,\n'             "$(json_str "$attempt")"
    printf '  "last_success": %s,\n'             "$(json_str "$last_success")"
    printf '  "filename": %s,\n'                 "$(json_str "$filename")"
    printf '  "encrypted_size": %s,\n'           "$(json_size "$size")"
    printf '  "duration_seconds": %s,\n'         "$dur"
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
  : "${BACKUP_REMOTE_DAILY_RETENTION:=14}"
  : "${BACKUP_REMOTE_WEEKLY_RETENTION:=8}"
  : "${BACKUP_WEEKLY_DAY:=7}"
  : "${BACKUP_RCLONE_CONTIMEOUT:=15s}"
  : "${BACKUP_RCLONE_TIMEOUT:=120s}"
  : "${BACKUP_DB_CONTAINER:=online-shopping-db}"
  : "${BACKUP_DB_USER:=shop_admin}"
  : "${BACKUP_DB_NAME:=online_shopping}"

  local value
  for key in BACKUP_REMOTE_DAILY_RETENTION BACKUP_REMOTE_WEEKLY_RETENTION; do
    value="${!key}"
    [[ "$value" =~ ^[0-9]+$ && "$value" -ge 1 ]] || fail "config" "$key must be a positive integer (got: $value)"
  done
  # D1: the LOCAL retention count resolves through the SHARED default and rule
  # (deploy/backup-capacity.sh), exactly like the preflight. The strict parser exports only keys
  # PRESENT in backup.env, so an omitted key must mean the same default (3) for both components
  # and an explicit value must be validated identically by both — the preflight can never pass on
  # a retention count that a real backup run would reject or interpret differently.
  if ! BACKUP_LOCAL_RETENTION_COUNT=$(resolve_backup_retention_count); then
    fail "config" "BACKUP_LOCAL_RETENTION_COUNT must be a positive integer (got: ${BACKUP_LOCAL_RETENTION_COUNT:-<unset, shared default $BACKUP_DEFAULT_RETENTION_COUNT>})"
  fi
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
  # N14: age-keygen is a runtime dependency of the backup pipeline (preflight derives the
  # recipient from the identity and the DR proof derives a recipient from a generated key).
  for tool in docker age age-keygen rclone sha256sum flock df stat; do
    command -v "$tool" >/dev/null 2>&1 || fail "deps" "required tool not found: $tool"
  done
}

verify_db_running() {
  local running
  running=$(docker inspect --format '{{.State.Running}}' "$BACKUP_DB_CONTAINER" 2>/dev/null || true)
  [[ "$running" == "true" ]] || fail "db_unavailable" "database container $BACKUP_DB_CONTAINER is not running"
}

verify_capacity() {
  # N5: the capacity rule is SHARED with scripts/preflight-backup.sh and restore.sh's safety
  # snapshot (deploy/backup-capacity.sh): estimate_unit = max(prior archive, live DB size,
  # 100 MiB floor), required = unit * (retention + 2) + 512 MiB. A preflight PASS therefore
  # always implies this check passes for the same inputs, and vice versa. The check runs BEFORE
  # staging anything, so a backup run can never fill the filesystem.
  local db_size prior_unit unit required avail
  db_size=""
  local -a size_env=()
  if [[ -n "${BACKUP_DB_PASSWORD:-}" ]]; then
    export PGPASSWORD="$BACKUP_DB_PASSWORD"
    size_env=(-e PGPASSWORD)
  fi
  db_size=$(docker exec "${size_env[@]}" "$BACKUP_DB_CONTAINER" \
      psql -At -v ON_ERROR_STOP=1 -U "$BACKUP_DB_USER" -d "$BACKUP_DB_NAME" \
      -c "SELECT pg_database_size(current_database())" 2>/dev/null | tr -d ' \r' || true)
  [[ "$db_size" =~ ^[0-9]+$ ]] || db_size=""

  prior_unit=$(find "$BACKUP_LOCAL_DIR" -maxdepth 1 -type f -name '*.dump.age' -printf '%s\n' 2>/dev/null | sort -rn | head -n 1 || true)
  [[ "$prior_unit" =~ ^[0-9]+$ ]] || prior_unit=""

  unit=$(estimate_backup_unit "$db_size" "$prior_unit")
  required=$(required_backup_space "$unit" "$BACKUP_LOCAL_RETENTION_COUNT")

  avail=$(filesystem_avail "$BACKUP_LOCAL_DIR" || true)
  if [[ ! "$avail" =~ ^[0-9]+$ ]] || (( avail < required )); then
    fail "insufficient_staging_space" "not enough free space on $BACKUP_LOCAL_DIR (need at least $required bytes, have ${avail:-unknown}); refusing to risk exhausting the filesystem"
  fi
  log "capacity check passed: $BACKUP_LOCAL_DIR has ${avail} bytes free (need >= $required)"
}

encrypt_dump() {
  # $1 = output path. Streams pg_dump through age so a plaintext dump is never written to disk.
  # PIPESTATUS distinguishes a dump failure from an encryption failure; pipefail alone could not
  # report which stage produced the truncated stream.
  local out="$1"
  local -a dump_env=() pipeline_status
  # M3: the database password travels to the container through the docker exec environment.
  # `export PGPASSWORD` + `-e PGPASSWORD` (env-by-name) keeps the value OUT of the host argv
  # (a `-e PGPASSWORD=...` form would expose it via /proc/*/cmdline and `ps`).
  if [[ -n "${BACKUP_DB_PASSWORD:-}" ]]; then
    export PGPASSWORD="$BACKUP_DB_PASSWORD"
    dump_env=(-e PGPASSWORD)
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
  # N14: classify the ROOT CAUSE. age exits 141 (SIGPIPE) when the dump dies mid-stream — that is
  # a SYMPTOM of the dump failing, not an encryption failure. An age exit other than 141 means age
  # itself failed (e.g. bad recipient) and is the root cause even when the dump also died on the
  # broken pipe. With --output, age's stdout is never read, so a genuine 141 cannot originate
  # downstream of age.
  if (( pipeline_status[1] != 0 && pipeline_status[1] != 141 )); then
    fail "encrypt_failed" "age encryption failed (exit ${pipeline_status[1]})"
  fi
  if (( pipeline_status[0] != 0 )); then
    fail "dump_failed" "pg_dump failed (exit ${pipeline_status[0]})"
  fi
  if (( pipeline_status[1] != 0 )); then
    fail "encrypt_failed" "age encryption failed (exit ${pipeline_status[1]})"
  fi
}

# N10/D6: the shared recipient-stanza helper lives in deploy/backup-capacity.sh (ONE definition
# across backup.sh, deploy.sh and restore.sh). It is set -e-safe and must be called as
# `if ! age_header_has_recipient_stanza "$file"; then ...; fi`.

verify_remote() {
  # $1 = local encrypted file, $2 = rclone destination (no trailing slash), $3 = local .sha256
  # sidecar. Returns 0 iff (a) the remote object, downloaded back and hashed locally, matches the
  # local SHA-256, and (b) the remote .sha256 sidecar is present and matches the local sidecar.
  # No remote-computed hash (S3 ETag, B2 SHA1, ...) is trusted, so verification is
  # provider-independent.
  local file="$1" dest="$2" sidecar="$3" name expected downloaded dir s_local s_dl
  name=$(basename "$file")
  expected=$(sha256sum "$file" | awk '{print $1}')
  dir=$(mktemp -d "$BACKUP_LOCAL_DIR/.verify.XXXXXX")
  chmod 0700 "$dir"
  if ! rclone copy "${RTIMEOUT[@]}" "$dest/$name" "$dir/" >/dev/null 2>&1; then
    rm -rf -- "$dir"
    return 1
  fi
  if [[ ! -f "$dir/$name" ]]; then
    rm -rf -- "$dir"
    return 1
  fi
  downloaded=$(sha256sum "$dir/$name" | awk '{print $1}')
  s_local=$(cat "$sidecar" 2>/dev/null || true)
  if ! rclone copy "${RTIMEOUT[@]}" "$dest/$name.sha256" "$dir/" >/dev/null 2>&1; then
    rm -rf -- "$dir"
    return 1
  fi
  if [[ ! -f "$dir/$name.sha256" ]]; then
    rm -rf -- "$dir"
    return 1
  fi
  s_dl=$(cat "$dir/$name.sha256" 2>/dev/null || true)
  rm -rf -- "$dir"
  [[ -n "$downloaded" && "$downloaded" == "$expected" && -n "$s_dl" && "$s_dl" == "$s_local" ]]
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
  # N8: the .sha256 integrity sidecar is pruned TOGETHER with its archive, so a pruned backup
  # never leaves an orphaned sidecar behind on the remote.
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
      if ! rclone delete "${RTIMEOUT[@]}" "$dest/$name.sha256" >/dev/null 2>&1; then
        warn "failed to prune remote $tier sidecar $name.sha256"
      fi
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

# shellcheck disable=SC2329
on_exit() {
  if [[ -n "$STAGEDIR" && -d "$STAGEDIR" ]]; then
    rm -rf -- "$STAGEDIR"
  fi
}

# Set by main() as soon as the lock is acquired (N9); used by write_status to record the run
# duration in the status file.
RUN_START=0

# shellcheck disable=SC2329
interrupt_handler() {
  if [[ "$STATUS_LAST" != "ok" && "$STATUS_LAST" != "error" ]]; then
    write_status "error" "interrupted" "" "" ""
  fi
  exit 130
}

# shellcheck disable=SC2329
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

  RUN_START=$(date +%s)
  acquire_lock
  load_config
  validate_config
  verify_deps
  verify_db_running
  verify_capacity

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
  # age >= 1.0 addresses archives with an EPHEMERAL X25519 stanza (`-> X25519 <ephemeral key>`);
  # the bech32 "age1..." recipient string NEVER appears in the file, and the ephemeral key
  # changes on every encryption, so the stanza cannot name the recipient (proving the recipient
  # cryptographically requires decrypting with the identity, which the backup job does not hold;
  # the disaster-recovery suite proves addressing by decrypting the archive with its identity).
  # Validate the stanza STRUCTURE so a non-age or mis-addressed output (e.g. passphrase mode)
  # is caught and never treated as a valid backup. N10: the scan is limited to the age header
  # area (the body is encrypted binary and is never scanned).
  if ! age_header_has_recipient_stanza "$stage"; then
    fail "encrypt_failed" "encrypted output does not contain a valid age X25519 recipient stanza"
  fi

  chmod 0600 "$stage"
  mv -f "$stage" "$final_path"   # atomic rename: a partial archive can never look complete
  log "encrypted backup ready: $final_path"

  # Provider-independent integrity: upload the archive AND a .sha256 sidecar. Verification later
  # downloads the remote object and compares its local SHA-256 against this sidecar/local value.
  sha256sum "$final_path" | awk -v n="$(basename "$final_path")" '{printf "%s  %s\n", $1, n}' > "$STAGEDIR/$(basename "$final_path").sha256"
  chmod 0600 "$STAGEDIR/$(basename "$final_path").sha256"

  if ! rclone copy "${RTIMEOUT[@]}" "$final_path" "$dest/"; then
    fail "upload_failed" "rclone copy to $dest failed"
  fi
  if ! rclone copy "${RTIMEOUT[@]}" "$STAGEDIR/$(basename "$final_path").sha256" "$dest/"; then
    fail "upload_failed" "rclone upload of the .sha256 sidecar to $dest failed"
  fi
  log "uploaded to $dest"

  if ! verify_remote "$final_path" "$dest" "$STAGEDIR/$(basename "$final_path").sha256"; then
    fail "upload_verify_failed" "remote object or its .sha256 sidecar for $(basename "$final_path") could not be downloaded or does not match the local SHA-256"
  fi
  log "remote object verified (downloaded + SHA-256, sidecar confirmed) for $(basename "$final_path")"

  size=$(stat -c %s "$final_path")
  remote_id="$dest/$(basename "$final_path")"

  local_retention
  remote_retention "$dest"

  write_status "ok" "" "$(basename "$final_path")" "$size" "$remote_id"
  local dur
  dur=$(( $(date +%s) - RUN_START ))
  [[ "$dur" -ge 0 ]] || dur=0
  log "backup complete: $filename ($size bytes) -> $remote_id (duration ${dur}s)"
}

main "$@"