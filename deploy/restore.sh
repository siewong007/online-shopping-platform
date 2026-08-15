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
# requires a password, set PGPASSWORD before invoking; it is passed to the container via -e and
# never appears in a command-line argument.
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
  local readiness
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
  if ! docker exec -e "PGPASSWORD=${PGPASSWORD:-}" "$CONTAINER" \
      psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DATABASE" -c "$readiness" >/dev/null 2>&1; then
    fail "restore_verify_failed" "readiness schema check failed after restore"
  fi
  log "readiness schema check passed"
  local ledger
  ledger=$(docker exec -e "PGPASSWORD=${PGPASSWORD:-}" "$CONTAINER" \
      psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DATABASE" -c "SELECT count(*) FROM app_schema_migrations")
  log "app_schema_migrations rows after restore: ${ledger:-<table absent>}"
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

COUNT_CONTAINER=0
COUNT_DATABASE=0
COUNT_DB_USER=0
COUNT_IDENTITY=0
COUNT_CONFIRM=0
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
    --target-kind)       TARGET_KIND="$2"; shift 2 ;;
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
if (( COUNT_CONTAINER > 1 || COUNT_DATABASE > 1 || COUNT_DB_USER > 1 || COUNT_IDENTITY > 1 || COUNT_CONFIRM > 1 )); then
  fail "invalid_target" "duplicate value flags are not allowed (each of --container/--database/--db-user/--identity/--confirm-production may be given at most once)"
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

WORK=$(mktemp -d "${TMPDIR:-/tmp}/restore.XXXXXX")
chmod 0700 "$WORK"
DUMP="$WORK/restore.dump"
trap 'rm -rf -- "$WORK"' EXIT

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
  if ! docker exec -i -e "PGPASSWORD=${PGPASSWORD:-}" "$CONTAINER" \
      pg_restore --no-owner --no-acl --clean --if-exists --single-transaction --exit-on-error \
        -U "$DB_USER" -d "$DATABASE" < "$DUMP"; then
    fail "restore_failed" "pg_restore reported a failure; the --single-transaction restore rolled back, leaving the target unchanged"
  fi
  verify_restore
  log "restore complete into $CONTAINER:$DATABASE"
  exit 0
fi

fail "unknown_mode" "unknown mode: $MODE"