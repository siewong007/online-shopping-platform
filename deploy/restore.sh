#!/usr/bin/env bash
#
# Restore an encrypted online-shopping database backup.
#
# Safe by default: nothing is touched unless an explicit mode is given and, for restores, an
# explicit destructive confirmation is supplied. `./restore.sh file.dump.age` alone never restores
# over anything; it exits 2 with usage.
#
# --verify is read-only (pg_restore --list). --restore is DESTRUCTIVE: it drops and recreates every
# object contained in the archive (pg_restore --clean --if-exists --single-transaction
# --exit-on-error), running the whole restore as ONE transaction so a mid-restore failure rolls the
# target back to its previous state. To run it you must name the target container, database and user
# AND pass --destroy-target AND --target-kind production|isolated.
#
# Targeting is FAIL CLOSED:
#   - --database and --db-user must be strict, bare PostgreSQL identifiers (no URI/conninfo, no '=',
#     no whitespace, no quoting). Anything else is rejected before any decryption or pg_restore.
#   - --target-kind is mandatory for --restore. "production" requires BOTH the canonical container
#     online-shopping-db AND the canonical database online_shopping AND the exact confirmation
#     --confirm-production "RESTORE online_shopping". "isolated" rejects the production container
#     name and database name outright.
#   - A production-named container or database with the wrong/absent --target-kind is rejected.
#   - Identity is resolved with `docker inspect` BEFORE anything is decrypted (N-H2): the target
#     must resolve to the actual running container, and a production restore additionally requires
#     that the resolved container ID IS the production container's ID. An isolated restore refuses
#     to run if the target resolves (by name, short/full ID, or alias) to production. If docker
#     cannot resolve the target, the restore refuses to start.
#
# Production restores additionally take an encrypted pre-restore safety snapshot of the CURRENT
# database before decrypting (pg_dump piped through age, no network required), and fail closed if
# that snapshot cannot be produced and verified. Its location is logged so it can be recovered.
#
# Requires a running postgres container (its pg_restore/psql are used) and the age private identity
# that matches the backup recipient. The private key must live OFF the backup server and OFF the
# backup bucket.
#
# Usage:
#   restore.sh --verify <archive.dump.age> --container <container> [--identity <age-key>]
#   restore.sh --restore <archive.dump.age> --container <container> --database <db> \
#              --db-user <user> --destroy-target --target-kind isolated \
#              [--identity <age-key>]
#   restore.sh --restore <archive.dump.age> --container online-shopping-db --database online_shopping \
#              --db-user <user> --destroy-target --target-kind production \
#              --confirm-production "RESTORE online_shopping" [--identity <age-key>]
#
# The age private identity may also be provided via RESTORE_AGE_IDENTITY. If the target database
# requires a password, set PGPASSWORD before invoking; it is exported and forwarded to the container
# with `docker exec -e PGPASSWORD` (env inheritance by name), so the value NEVER appears in the host argv
# (see N-H3). RESTORE_WORKDIR sets the staging directory (default: TMPDIR or /tmp); for a
# production restore the safety snapshot goes to RESTORE_SNAPSHOT_DIR (default
# /opt/online-shopping/backups).
set -Eeuo pipefail
umask 077

VERIFY=0
RESTORE=0
ARCHIVE=""
CONTAINER=""
DATABASE=""
DB_USER=""
DESTROY_TARGET=""
TARGET_KIND=""
CONFIRM_PRODUCTION=""
IDENTITY="${RESTORE_AGE_IDENTITY:-}"

PROD_CONTAINER="online-shopping-db"
PROD_DATABASE="online_shopping"
CONFIRM_STRING="RESTORE online_shopping"

# N5: the shared capacity rule (deploy/backup-capacity.sh) is also used by the pre-restore
# safety snapshot, so every component computes the same requirement.
# shellcheck disable=SC1091,SC1090
if ! source "$(dirname "${BASH_SOURCE[0]}")/backup-capacity.sh" 2>/dev/null; then
  echo "[online-shopping-restore] ERROR [deps] backup-capacity.sh is missing next to restore.sh; refusing to continue without the shared capacity rule" >&2
  exit 1
fi

log() { printf '[online-shopping-restore] %s\n' "$*"; }
fail() { local category="${1:-unknown}" message="${2:-restore failed}"; log "ERROR [$category] $message"; exit 1; }

usage() {
  cat <<'EOF'
usage:
  restore.sh --verify <archive.dump.age> --container <container> [--identity <age-key>]
  restore.sh --restore <archive.dump.age> --container <container> --database <db>
             --db-user <user> --destroy-target --target-kind production|isolated
             [--identity <age-key>] [--confirm-production "RESTORE online_shopping"]

--verify  lists the archive's table of contents using a running postgres container. Read-only; it
          needs no --destroy-target and never modifies anything.

--restore applies the archive to an explicitly named target. It is DESTRUCTIVE: it drops and
          recreates every object the archive contains (pg_restore --clean --if-exists
          --single-transaction --exit-on-error) and refuses to run without --destroy-target and
          --target-kind. The whole restore runs as ONE transaction; any failure rolls back so the
          target is left unchanged.

--database and --db-user must be strict, bare PostgreSQL identifiers. URIs, conninfo strings,
          '=', whitespace, quotes or any other character outside [A-Za-z0-9_$] are rejected before
          anything is decrypted or restored.

--target-kind  production requires the canonical container online-shopping-db AND the canonical
               database online_shopping AND --confirm-production "RESTORE online_shopping".
               isolated rejects the production container and database names outright. A missing
               --target-kind (or a production-named target under the wrong kind) is rejected.

The age private identity is required to decrypt: pass --identity or set RESTORE_AGE_IDENTITY.
Default (no mode flag) prints this help and exits 2.
EOF
}

verify_restore() {
  # Readiness schema probe mirrors backend/src/modules/health/controller.rs, plus the migration
  # ledger count. A restored database must satisfy both before the restore is reported complete.
  # This is a schema/readiness check, NOT a full source/target row-count parity test: a disaster
  # restore has no live source. The isolated scripts/restore-proof.sh harness performs the strong
  # row/schema/content parity test against a throwaway target.
  local readiness pass_env=()
  # M3: forward the password to the container by NAME only (`-e PGPASSWORD`); the value is
  # exported, never placed on the host command line.
  if [[ -n "${PGPASSWORD:-}" ]]; then
    export PGPASSWORD
    pass_env=(-e PGPASSWORD)
  fi
  readiness='SELECT payments.provider, payments.provider_request_id, orders.stock_released_at,
       orders.stock_reacquired_at, products.source_item_code, products.shipping_class,
       product_reviews.id, shipping_services.code, shipping_service_rates.shipping_class,
       order_shipping_addresses.order_id, shipments.id, customer_sessions.user_agent,
       customer_sessions.last_seen_at, customer_sessions.mfa_verified_at,
       admin_sessions.mfa_verified_at, admin_mfa_factors.admin_user_id,
       customer_mfa_factors.customer_account_id
FROM payments CROSS JOIN orders CROSS JOIN products CROSS JOIN shipping_services
CROSS JOIN shipping_service_rates CROSS JOIN order_shipping_addresses CROSS JOIN shipments
CROSS JOIN customer_sessions CROSS JOIN admin_sessions CROSS JOIN admin_mfa_factors
CROSS JOIN customer_mfa_factors
LEFT JOIN product_reviews ON product_reviews.product_id = products.id LIMIT 0'
  if ! docker exec "${pass_env[@]}" "$CONTAINER" \
      psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DATABASE" -c "$readiness" >/dev/null 2>&1; then
    fail "restore_verify_failed" "readiness schema check failed after restore"
  fi
  log "readiness schema check passed"
  # The migration ledger must be present and non-empty after a restore; a missing/empty table is
  # a failed restore, not a cosmetic log line.
  local ledger
  ledger=$(docker exec "${pass_env[@]}" "$CONTAINER" \
      psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DATABASE" -c "SELECT count(*) FROM app_schema_migrations" 2>/dev/null | tr -d ' \r' || true)
  if [[ ! "$ledger" =~ ^[0-9]+$ || "$ledger" -eq 0 ]]; then
    fail "restore_verify_failed" "migration ledger is absent or empty after restore (got: ${ledger:-<no output>})"
  fi
  log "app_schema_migrations rows after restore: $ledger"
}

# Regexes live in variables: inside `[[ =~ ]]` the unquoted RHS is subject to parameter
# expansion, so a literal `$-` in the pattern would expand to the shell's option flags.
ID_RE='^[A-Za-z_][A-Za-z0-9_.$-]*$'
CONTAINER_RE='^[A-Za-z0-9][A-Za-z0-9_.-]*$'
is_identifier() { [[ "$1" =~ $ID_RE ]]; }
is_container_name() { [[ "$1" =~ $CONTAINER_RE ]]; }

validate_restore_target() {
  # Called after the full argument parse. All rejection happens here, BEFORE decryption, so a
  # hostile or malformed --database/--container can never reach pg_restore or age.
  is_container_name "$CONTAINER" \
    || fail "invalid_target" "container name '$CONTAINER' is malformed; expected letters, digits, '_', '.', '-'"
  is_identifier "$DATABASE" \
    || fail "invalid_target" "database '$DATABASE' is not a bare PostgreSQL identifier (URIs, conninfo, '=', whitespace and quoting are not allowed)"
  is_identifier "$DB_USER" \
    || fail "invalid_target" "database user '$DB_USER' is not a bare PostgreSQL identifier (URIs, conninfo, '=', whitespace and quoting are not allowed)"

  case "$TARGET_KIND" in
    production)
      if [[ "$CONTAINER" != "$PROD_CONTAINER" || "$DATABASE" != "$PROD_DATABASE" ]]; then
        fail "invalid_target" "target-kind production requires the canonical container '$PROD_CONTAINER' and database '$PROD_DATABASE' (got container=$CONTAINER database=$DATABASE)"
      fi
      if [[ "$CONFIRM_PRODUCTION" != "$CONFIRM_STRING" ]]; then
        fail "production_confirmation_required" "targeting production requires the exact confirmation: --confirm-production \"$CONFIRM_STRING\""
      fi
      ;;
    isolated)
      if [[ "$CONTAINER" == "$PROD_CONTAINER" || "$DATABASE" == "$PROD_DATABASE" ]]; then
        fail "invalid_target" "target-kind isolated must not target the production container '$PROD_CONTAINER' or database '$PROD_DATABASE'"
      fi
      ;;
    *)
      fail "missing_target" "--restore is destructive and requires --target-kind production|isolated"
      ;;
  esac

  if [[ -n "$CONFIRM_PRODUCTION" && "$TARGET_KIND" != "production" ]]; then
    fail "invalid_target" "--confirm-production is only meaningful with --target-kind production"
  fi
}

# N-H2: resolve a docker container to its canonical 64-char ID (name, short/full ID or alias all collapse
# to one identity). Returns 1 if the container cannot be resolved.
docker_resolve_id() {
  local id
  id=$(docker inspect --format '{{.Id}}' "$1" 2>/dev/null | tr -d ' \r\n') || return 1
  [[ -n "$id" ]] || return 1
  printf '%s\n' "$id"
}

# N-H2: before ANY decryption or destruction, resolve the target container to its actual docker
# identity and enforce the production boundary by identity, not just by name.
resolve_target_identity() {
  local target_id prod_id
  target_id=$(docker_resolve_id "$CONTAINER") \
    || fail "target_resolution_failed" "container '$CONTAINER' could not be resolved by docker (name, short/full ID or alias not found); refusing a destructive restore"
  [[ -n "$target_id" ]] \
    || fail "target_resolution_failed" "docker returned no identity for container '$CONTAINER'; refusing a destructive restore"
  case "$TARGET_KIND" in
    production)
      prod_id=$(docker_resolve_id "$PROD_CONTAINER") \
        || fail "target_resolution_failed" "cannot resolve the production container '$PROD_CONTAINER'; refusing a production restore"
      [[ "$target_id" == "$prod_id" ]] \
        || fail "invalid_target" "container '$CONTAINER' resolves to a different container than production (id mismatch); refusing a production restore"
      ;;
    isolated)
      # N1: FAIL CLOSED — if the PRODUCTION container identity cannot be resolved, this run
      # cannot prove the target is not production, so it must refuse instead of assuming
      # safety. A resolution failure is NEVER interpreted as "production is absent".
      prod_id=$(docker_resolve_id "$PROD_CONTAINER") \
        || fail "target_resolution_failed" "cannot resolve the production container '$PROD_CONTAINER' by docker (name, short/full ID or alias); refusing an isolated restore that cannot prove its target is not production"
      [[ "$target_id" == "$prod_id" ]] \
        && fail "invalid_target" "isolated target '$CONTAINER' resolves to the production container by name, short/full ID or alias; refusing to destroy production"
      ;;
  esac
  log "target container '$CONTAINER' resolved to docker id ${target_id:0:12}"
}

# Pre-restore capacity check: the encrypted archive plus headroom must fit in the staging
# directory BEFORE decrypting (a decrypt must never be the thing that fills the disk).
check_staging_capacity() {
  local work_base="${RESTORE_WORKDIR:-${TMPDIR:-/tmp}}"
  local archive_bytes need avail
  archive_bytes=$(stat -c %s "$ARCHIVE")
  need=$(( archive_bytes * 2 + 536870912 ))
  avail=$(df --output=avail -B1 "$work_base" 2>/dev/null | tail -n 1 | tr -d ' ')
  if [[ ! "$avail" =~ ^[0-9]+$ || "$avail" -lt "$need" ]]; then
    fail "insufficient_staging_space" "not enough free space before decrypting (staging $work_base needs >= $need bytes, have ${avail:-unknown}); refusing to start"
  fi
}

# Production-only encrypted safety snapshot of the CURRENT database, taken BEFORE decrypting the
# restore archive. Fail closed: a production restore cannot begin if this snapshot cannot be made
# and validated. The snapshot is standalone (pg_dump | age) and never touches the network.
snapshot_production() {
  local snap_dir="${RESTORE_SNAPSHOT_DIR:-/opt/online-shopping/backups}"
  install -d -m 0700 "$snap_dir" \
    || fail "safety_snapshot_failed" "cannot create the safety-snapshot directory $snap_dir"
  local recipient snap tmp pipeline pass_env=()
  if [[ -n "${PGPASSWORD:-}" ]]; then
    export PGPASSWORD
    pass_env=(-e PGPASSWORD)
  fi
  recipient=$(age-keygen -y "$IDENTITY" 2>/dev/null | tail -n 1) \
    || fail "safety_snapshot_failed" "cannot derive the age recipient from the identity for the pre-restore safety snapshot"

  # N2: capacity check BEFORE pg_dump — the snapshot plus headroom must fit in snap_dir, and a
  # production restore must never be the thing that fills the filesystem. Uses the SAME shared
  # capacity rule as backup.sh and the preflight (deploy/backup-capacity.sh).
  local db_size prior_unit unit required avail
  db_size=$(docker exec "${pass_env[@]}" "$CONTAINER" \
      psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DATABASE" \
      -c "SELECT pg_database_size(current_database())" 2>/dev/null | tr -d ' \r' || true)
  [[ "$db_size" =~ ^[0-9]+$ ]] || db_size=""
  prior_unit=$(find "$snap_dir" -maxdepth 1 -type f -name 'pre-restore-*.dump.age' -printf '%s\n' 2>/dev/null | sort -rn | head -n 1 || true)
  [[ "$prior_unit" =~ ^[0-9]+$ ]] || prior_unit=""
  unit=$(estimate_backup_unit "$db_size" "$prior_unit")
  required=$(required_backup_space "$unit" 0)
  avail=$(filesystem_avail "$snap_dir" || true)
  if [[ ! "$avail" =~ ^[0-9]+$ ]] || (( avail < required )); then
    fail "safety_snapshot_failed" "not enough free space in $snap_dir for the pre-restore safety snapshot (need at least $required bytes, have ${avail:-unknown}); refusing to restore production"
  fi
  log "safety snapshot capacity check passed: $snap_dir has ${avail} bytes free (need >= $required)"

  local ts
  ts=$(date -u +%Y%m%dT%H%M%SZ)
  tmp=$(mktemp "$snap_dir/.pre-restore.XXXXXX")
  chmod 0600 "$tmp"
  set +e
  docker exec "${pass_env[@]}" "$CONTAINER" pg_dump --format=custom --no-owner --no-acl \
      -U "$DB_USER" "$DATABASE" \
    | age --encrypt --recipient "$recipient" --output "$tmp"
  pipeline=("${PIPESTATUS[@]}")
  set -e
  # N14: classify the ROOT CAUSE. age exits 141 (SIGPIPE) when the dump dies mid-stream — that is
  # a SYMPTOM of the dump failing, not an encryption failure. An age exit other than 141 means age
  # itself failed and is the root cause even when the dump also died on the broken pipe.
  if (( pipeline[1] != 0 && pipeline[1] != 141 )); then
    rm -f -- "$tmp"
    fail "safety_snapshot_failed" "age encryption of the pre-restore safety snapshot failed (exit ${pipeline[1]})"
  fi
  if (( pipeline[0] != 0 )); then
    rm -f -- "$tmp"
    fail "safety_snapshot_failed" "pg_dump of the current database failed (exit ${pipeline[0]}); refusing to restore production without a safety snapshot"
  fi
  if (( pipeline[1] != 0 )); then
    rm -f -- "$tmp"
    fail "safety_snapshot_failed" "age encryption of the pre-restore safety snapshot failed (exit ${pipeline[1]})"
  fi
  if [[ ! -s "$tmp" ]] || ! head -c 100 "$tmp" | grep -q '^age-encryption.org/v1'; then
    rm -f -- "$tmp"
    fail "safety_snapshot_failed" "pre-restore safety snapshot is empty or invalid; refusing to restore production"
  fi
  # D2/D6: the shared set -e-safe helper (deploy/backup-capacity.sh) validates the X25519
  # recipient stanza against the BOUNDED age header (ends at the `--- ` MAC line or a 16-line
  # cap); the body is encrypted binary and is never scanned. The OLD standalone
  # `stanza_count=$(... | grep -c ...)` assignment aborted the script BEFORE the cleanup and
  # diagnostics below ran when zero lines matched (grep -c exits 1 under set -e).
  if ! age_header_has_recipient_stanza "$tmp"; then
    rm -f -- "$tmp"
    fail "safety_snapshot_failed" "pre-restore safety snapshot has no valid age X25519 recipient stanza; refusing to restore production"
  fi
  # M2: TOCTOU-free, race-safe publication. `mv -f` could silently OVERWRITE a racing restore's
  # snapshot, and `mv -n` is NOT a reliable no-clobber primitive: GNU mv may return 0 when the
  # destination exists and the source is left untouched (RENAME_NOREPLACE is only attempted on
  # Linux and silently degrades to a plain rename/overwrite on filesystems without it), so its
  # exit status cannot be trusted to mean a move happened. The publication is therefore a HARD
  # LINK (shared helper deploy/backup-capacity.sh:publish_no_clobber): atomic, and its success is
  # definitive — the destination did not exist and now holds EXACTLY this run's bytes. On
  # collision (EEXIST) the name is retried with an incrementing numeric suffix; the temp file is
  # removed ONLY after a successful link (consumed exactly once), and retry exhaustion fails
  # closed — a snapshot that cannot be placed means no destructive restore.
  snap="$(publish_no_clobber "$tmp" "$snap_dir" "pre-restore-$ts")" \
    || fail "safety_snapshot_failed" "cannot place the pre-restore safety snapshot after 100 name collisions; refusing to restore production"
  log "encrypted pre-restore safety snapshot written: $snap"
  log "  (emergency recovery: decrypt with the same identity and pg_restore into a clean database)"
}

COUNT_CONTAINER=0
COUNT_DATABASE=0
COUNT_DB_USER=0
COUNT_IDENTITY=0
COUNT_CONFIRM=0
COUNT_TARGET_KIND=0
ARCHIVES=0

while (( $# > 0 )); do
  case "$1" in
    --verify)            VERIFY=1; shift ;;
    --restore)           RESTORE=1; shift ;;
    --container)         COUNT_CONTAINER=$((COUNT_CONTAINER + 1)); CONTAINER="$2"; shift 2 ;;
    --database)          COUNT_DATABASE=$((COUNT_DATABASE + 1)); DATABASE="$2"; shift 2 ;;
    --db-user)           COUNT_DB_USER=$((COUNT_DB_USER + 1)); DB_USER="$2"; shift 2 ;;
    --identity)          COUNT_IDENTITY=$((COUNT_IDENTITY + 1)); IDENTITY="$2"; shift 2 ;;
    --destroy-target)    DESTROY_TARGET="yes"; shift ;;
    --target-kind)       COUNT_TARGET_KIND=$((COUNT_TARGET_KIND + 1)); TARGET_KIND="$2"; shift 2 ;;
    --confirm-production) COUNT_CONFIRM=$((COUNT_CONFIRM + 1)); CONFIRM_PRODUCTION="$2"; shift 2 ;;
    -h|--help)           usage; exit 0 ;;
    -*)                  log "ERROR unknown option: $1"; usage; exit 2 ;;
    *)                   ARCHIVES=$((ARCHIVES + 1)); ARCHIVE="$1"; shift ;;
  esac
done

# Structural rejects: ambiguous/conflicting/missing arguments fail before any work happens.
if (( ARCHIVES > 1 )); then
  log "ERROR exactly one archive argument is allowed (got $ARCHIVES)"
  usage
  exit 2
fi
if (( VERIFY != 0 && RESTORE != 0 )); then
  log "ERROR --verify and --restore are mutually exclusive"
  exit 2
fi
if (( COUNT_CONTAINER > 1 || COUNT_DATABASE > 1 || COUNT_DB_USER > 1 || COUNT_IDENTITY > 1 || COUNT_CONFIRM > 1 || COUNT_TARGET_KIND > 1 )); then
  fail "invalid_target" "duplicate value flags are not allowed (each of --container/--database/--db-user/--identity/--confirm-production/--target-kind may be given at most once)"
fi

MODE=""
(( VERIFY != 0 )) && MODE="verify"
(( RESTORE != 0 )) && MODE="restore"

if [[ -z "$MODE" ]]; then
  usage
  exit 2
fi
if [[ -z "$ARCHIVE" || ! -f "$ARCHIVE" || ! -r "$ARCHIVE" ]]; then
  fail "invalid_archive" "archive not found or not readable: ${ARCHIVE:-<none>}"
fi
if [[ -z "$IDENTITY" || ! -f "$IDENTITY" || ! -r "$IDENTITY" ]]; then
  fail "missing_identity" "age private identity required (--identity <file> or RESTORE_AGE_IDENTITY)"
fi

if [[ "$MODE" == "verify" ]]; then
  is_container_name "$CONTAINER" || fail "missing_target" "--verify requires --container"
  if [[ -n "$DESTROY_TARGET" ]]; then
    log "ERROR --verify is read-only; it never takes --destroy-target"
    usage
    exit 2
  fi
  [[ -z "$DATABASE" && -z "$DB_USER" ]] || fail "invalid_target" "--verify takes no --database/--db-user"
elif [[ "$MODE" == "restore" ]]; then
  [[ -n "$CONTAINER" && -n "$DATABASE" && -n "$DB_USER" && "$DESTROY_TARGET" == "yes" ]] \
    || fail "missing_target" "--restore is destructive and requires --container, --database, --db-user and --destroy-target"
  validate_restore_target
else
  usage
  exit 2
fi

command -v age >/dev/null 2>&1 || fail "deps" "age not found"
command -v docker >/dev/null 2>&1 || fail "deps" "docker not found"

WORK_BASE="${RESTORE_WORKDIR:-${TMPDIR:-/tmp}}"
WORK=$(mktemp -d "$WORK_BASE/restore.XXXXXX")
chmod 0700 "$WORK"
DUMP="$WORK/restore.dump"
trap 'rm -rf -- "$WORK"' EXIT

# Capacity BEFORE decrypting: the encrypted archive plus headroom must fit in the staging dir.
check_staging_capacity

if [[ "$MODE" == "restore" ]]; then
  # N-H2: the target must resolve to a real container, and never to production under
  # --target-kind isolated. Runs before any decrypt or destruction.
  resolve_target_identity
  # Production safety snapshot of the current database, BEFORE the archive is even decrypted.
  if [[ "$TARGET_KIND" == "production" ]]; then
    snapshot_production
  fi
fi

log "decrypting $ARCHIVE"
age --decrypt --identity "$IDENTITY" --output "$DUMP" "$ARCHIVE" || fail "decrypt_failed" "age decryption failed"
[[ -s "$DUMP" ]] || fail "decrypt_failed" "decrypted archive is empty"

# M1: the archive must be a real pg_restore-readable custom-format dump BEFORE anything destructive.
if ! docker exec -i "$CONTAINER" pg_restore --list < "$DUMP" >/dev/null 2>&1; then
  fail "archive_not_restorable" "pg_restore could not read the decrypted archive (corrupt dump or wrong key)"
fi

# M9: confirm the staging volume can hold the decrypted archive plus headroom.
local_bytes=$(stat -c %s "$DUMP")
df_bytes=$(df --output=avail -B1 "$WORK" 2>/dev/null | tail -n 1 | tr -d ' ')
if [[ ! "$df_bytes" =~ ^[0-9]+$ || "$df_bytes" -lt $(( local_bytes * 2 )) ]]; then
  fail "insufficient_staging_space" "not enough free space in $WORK to restore safely (need >= $(( local_bytes * 2 )) bytes, have ${df_bytes:-unknown})"
fi

if [[ "$MODE" == "verify" ]]; then
  log "verifying archive structure with pg_restore --list (container: $CONTAINER)"
  entries=$(docker exec -i "$CONTAINER" pg_restore --list < "$DUMP" 2>/dev/null | wc -l)
  log "archive OK: $ARCHIVE (TOC entries: $entries)"
  exit 0
fi

if [[ "$MODE" == "restore" ]]; then
  log "restoring into container=$CONTAINER database=$DATABASE user=$DB_USER (destructive, guarded, single-transaction)"
  pass_env=()
  if [[ -n "${PGPASSWORD:-}" ]]; then
    export PGPASSWORD
    pass_env=(-e PGPASSWORD)
  fi
  if ! docker exec -i "${pass_env[@]}" "$CONTAINER" \
      pg_restore --no-owner --no-acl --clean --if-exists --single-transaction --exit-on-error \
        -U "$DB_USER" -d "$DATABASE" < "$DUMP"; then
    fail "restore_failed" "pg_restore reported a failure; the --single-transaction restore rolled back, leaving the target unchanged"
  fi
  verify_restore
  log "restore complete into $CONTAINER:$DATABASE"
  exit 0
fi

fail "unknown_mode" "unknown mode: $MODE"