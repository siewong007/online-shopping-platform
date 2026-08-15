#!/usr/bin/env bash
#
# Restore an encrypted online-shopping database backup.
#
# Safe by default: nothing is touched unless an explicit mode is given and, for restores, an
# explicit destructive confirmation is supplied. `./restore.sh file.dump.age` alone never restores
# over anything; it exits 2 with usage.
#
# --verify is read-only (pg_restore --list). --restore is DESTRUCTIVE: it drops and recreates every
# object contained in the archive (pg_restore --clean --if-exists --exit-on-error). To run it you
# must name the target container, database and user AND pass --destroy-target. Targeting the known
# production container (online-shopping-db) or database (online_shopping) additionally requires the
# exact confirmation string --confirm-production "RESTORE online_shopping".
#
# Requires a running postgres container (its pg_restore/psql are used) and the age private identity
# that matches the backup recipient. The private key must live OFF the backup server and OFF the
# backup bucket.
#
# Usage:
#   restore.sh --verify <archive.dump.age> --container <container> [--identity <age-key>]
#   restore.sh --restore <archive.dump.age> --container <container> --database <db> \
#              --db-user <user> --destroy-target [--identity <age-key>] \
#              [--confirm-production "RESTORE online_shopping"]
#
# The age private identity may also be provided via RESTORE_AGE_IDENTITY. If the target database
# requires a password, set PGPASSWORD before invoking.
set -Eeuo pipefail

MODE=""
ARCHIVE=""
CONTAINER=""
DATABASE=""
DB_USER=""
DESTROY_TARGET=""
CONFIRM_PRODUCTION=""
IDENTITY="${RESTORE_AGE_IDENTITY:-}"

log() { printf '[online-shopping-restore] %s\n' "$*"; }
fail() { local category="${1:-unknown}" message="${2:-restore failed}"; log "ERROR [$category] $message"; exit 1; }

usage() {
  cat <<'EOF'
usage:
  restore.sh --verify <archive.dump.age> --container <container> [--identity <age-key>]
  restore.sh --restore <archive.dump.age> --container <container> --database <db>
             --db-user <user> --destroy-target [--identity <age-key>]
             [--confirm-production "RESTORE online_shopping"]

--verify  lists the archive's table of contents using a running postgres container. Read-only; it
          needs no --destroy-target and never modifies anything.

--restore applies the archive to an explicitly named target. It is DESTRUCTIVE: it drops and
          recreates every object the archive contains (pg_restore --clean --if-exists
          --exit-on-error) and refuses to run without --destroy-target. If the container is
          online-shopping-db OR the database is online_shopping it also requires the exact string
          --confirm-production "RESTORE online_shopping" and aborts before pg_restore otherwise.

The age private identity is required to decrypt: pass --identity or set RESTORE_AGE_IDENTITY.
Default (no mode flag) prints this help and exits 2.
EOF
}

verify_restore() {
  # Readiness schema probe mirrors backend/src/modules/health/controller.rs, plus the migration
  # ledger count. A restored database must satisfy both before the restore is reported complete.
  # This is a schema/readiness check, NOT a full source/target row-count parity test: a disaster
  # restore has no live source. The isolated scripts/restore-proof.sh harness performs the strong
  # row/schema parity test against a throwaway target.
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
      psql -At -U "$DB_USER" -d "$DATABASE" -c "SELECT count(*) FROM app_schema_migrations" 2>/dev/null || true)
  log "app_schema_migrations rows after restore: ${ledger:-<table absent>}"
}

while (( $# > 0 )); do
  case "$1" in
    --verify)            MODE="verify"; shift ;;
    --restore)           MODE="restore"; shift ;;
    --container)         CONTAINER="$2"; shift 2 ;;
    --database)          DATABASE="$2"; shift 2 ;;
    --db-user)           DB_USER="$2"; shift 2 ;;
    --identity)          IDENTITY="$2"; shift 2 ;;
    --destroy-target)    DESTROY_TARGET="yes"; shift ;;
    --confirm-production) CONFIRM_PRODUCTION="$2"; shift 2 ;;
    -h|--help)           usage; exit 0 ;;
    -*)                  log "ERROR unknown option: $1"; usage; exit 2 ;;
    *)                   ARCHIVE="$1"; shift ;;
  esac
done

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
  [[ -n "$CONTAINER" ]] || fail "missing_target" "--verify requires --container"
elif [[ "$MODE" == "restore" ]]; then
  [[ -n "$CONTAINER" && -n "$DATABASE" && -n "$DB_USER" && "$DESTROY_TARGET" == "yes" ]] \
    || fail "missing_target" "--restore is destructive and requires --container, --database, --db-user and --destroy-target"
  if [[ "$CONTAINER" == "online-shopping-db" || "$DATABASE" == "online_shopping" ]]; then
    if [[ "$CONFIRM_PRODUCTION" != "RESTORE online_shopping" ]]; then
      fail "production_confirmation_required" "targeting the production container (online-shopping-db) or database (online_shopping) requires the exact confirmation: --confirm-production \"RESTORE online_shopping\""
    fi
  fi
fi

command -v age >/dev/null 2>&1 || fail "deps" "age not found"
command -v docker >/dev/null 2>&1 || fail "deps" "docker not found"

WORK=$(mktemp -d)
chmod 0700 "$WORK"
DUMP="$WORK/restore.dump"
trap 'rm -rf -- "$WORK"' EXIT

log "decrypting $ARCHIVE"
age --decrypt --identity "$IDENTITY" --output "$DUMP" "$ARCHIVE" || fail "decrypt_failed" "age decryption failed"
[[ -s "$DUMP" ]] || fail "decrypt_failed" "decrypted archive is empty"

if [[ "$MODE" == "verify" ]]; then
  log "verifying archive structure with pg_restore --list (container: $CONTAINER)"
  if ! docker exec -i "$CONTAINER" pg_restore --list < "$DUMP" >/dev/null 2>&1; then
    fail "archive_not_restorable" "pg_restore could not read the archive (corrupt or wrong key)"
  fi
  entries=$(docker exec -i "$CONTAINER" pg_restore --list < "$DUMP" 2>/dev/null | wc -l)
  log "archive OK: $ARCHIVE (TOC entries: $entries)"
  exit 0
fi

if [[ "$MODE" == "restore" ]]; then
  log "restoring into container=$CONTAINER database=$DATABASE user=$DB_USER (destructive, guarded)"
  if ! docker exec -i -e "PGPASSWORD=${PGPASSWORD:-}" "$CONTAINER" \
      pg_restore --no-owner --no-acl --clean --if-exists --exit-on-error \
        -U "$DB_USER" -d "$DATABASE" < "$DUMP"; then
    fail "restore_failed" "pg_restore reported a failure"
  fi
  verify_restore
  log "restore complete into $CONTAINER:$DATABASE"
  exit 0
fi

fail "unknown_mode" "unknown mode: $MODE"