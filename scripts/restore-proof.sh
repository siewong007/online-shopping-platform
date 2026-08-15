#!/usr/bin/env bash
#
# Non-destructive restore proof for the online-shopping encrypted backup pipeline.
#
#   local DB ──► pg_dump ──► age encrypt ──► rclone copy ──► (simulated off-server) ──►
#   age decrypt ──► pg_restore into a THROWAWAY postgres container ──► parity validation ──► destroy
#
# - Source: the local development database (default container online-shopping-db, db project_depot).
# - Target: a disposable container named online-shopping-restore-proof (postgres:19beta1).
# - Generates a disposable age keypair and a local-type rclone remote; touches no production data.
# - Cleans up the container, volume and all temporary state even on failure (traps).
#
# Requires: bash, docker, age (age + age-keygen), rclone. Run on any Linux host, e.g.:
#   scripts/restore-proof.sh
#
# Environment overrides: SOURCE_CONTAINER, SOURCE_USER, SOURCE_DB, SOURCE_PASSWORD,
# TARGET_* (defaults below), POSTGRES_IMAGE.
set -Eeuo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-online-shopping-db}"
SOURCE_USER="${SOURCE_USER:-project_depot}"
SOURCE_DB="${SOURCE_DB:-project_depot}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-project_depot}"

TARGET_CONTAINER="online-shopping-restore-proof"
TARGET_USER="${TARGET_USER:-restore}"
TARGET_PASSWORD="${TARGET_PASSWORD:-restore}"
TARGET_DB="${TARGET_DB:-restore_proof}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:19beta1}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SH="$REPO_ROOT/deploy/backup.sh"
RESTORE_SH="$REPO_ROOT/deploy/restore.sh"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/restore-proof.XXXXXX")"
chmod 0700 "$WORK"

trap 'set +e; docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

req() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
  done
}
req docker age age-keygen rclone

running=$(docker inspect --format '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null || true)
[[ "$running" == "true" ]] || { echo "source DB container $SOURCE_CONTAINER is not running" >&2; exit 1; }
echo "== source: $SOURCE_CONTAINER / $SOURCE_DB"

echo "== generating disposable age keypair"
age-keygen -o "$WORK/identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/identity.txt"
RECIPIENT="$(age-keygen -y "$WORK/identity.txt" 2>/dev/null | tail -n 1)"
[[ -n "$RECIPIENT" && "$RECIPIENT" == age1* ]] || { echo "failed to derive age recipient" >&2; exit 1; }

echo "== configuring local-type rclone remote (simulated off-server)"
mkdir -p "$WORK/rclone"
cat > "$WORK/rclone/rclone.conf" <<EOF
[proof-remote]
type = local
EOF
export RCLONE_CONFIG="$WORK/rclone/rclone.conf"
REMOTE_NAME="proof-remote"
REMOTE_PATH="$WORK/offserver"
LOCAL_DIR="$WORK/local"
APP_DIR="$WORK/app"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"

cat > "$WORK/backup.env" <<EOF
BACKUP_AGE_RECIPIENT=$RECIPIENT
BACKUP_RCLONE_REMOTE=$REMOTE_NAME
BACKUP_RCLONE_PATH=$REMOTE_PATH
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_LOCAL_RETENTION_COUNT=2
BACKUP_REMOTE_DAILY_RETENTION=2
BACKUP_REMOTE_WEEKLY_RETENTION=1
BACKUP_WEEKLY_DAY=7
BACKUP_DB_CONTAINER=$SOURCE_CONTAINER
BACKUP_DB_USER=$SOURCE_USER
BACKUP_DB_NAME=$SOURCE_DB
EOF
chmod 0600 "$WORK/backup.env"

export BACKUP_APP_DIR="$APP_DIR"
export BACKUP_CONFIG_FILE="$WORK/backup.env"
export BACKUP_STATUS_FILE="$APP_DIR/backup-status.json"
export BACKUP_LOCK_FILE="$APP_DIR/backup.lock"

echo "== running the real deploy/backup.sh"
if ! bash "$BACKUP_SH"; then
  echo "FAIL: deploy/backup.sh exited nonzero" >&2
  exit 1
fi

STATUS_JSON="$(cat "$BACKUP_STATUS_FILE")"
if ! grep -q '"status": "ok"' <<<"$STATUS_JSON"; then
  echo "FAIL: backup status file is not ok" >&2
  echo "$STATUS_JSON" >&2
  exit 1
fi
ENCRYPTED_FILE="$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' <<<"$STATUS_JSON")"
[[ -n "$ENCRYPTED_FILE" ]] || { echo "FAIL: no filename in status" >&2; exit 1; }
echo "== encrypted backup: $ENCRYPTED_FILE"
[[ -f "$LOCAL_DIR/$ENCRYPTED_FILE" ]] || { echo "FAIL: encrypted file missing locally" >&2; exit 1; }
rclone lsf --files-only "$REMOTE_NAME:$REMOTE_PATH/" | grep -qxF "$ENCRYPTED_FILE" \
  || { echo "FAIL: encrypted file missing on the remote" >&2; exit 1; }

echo "== confirming no plaintext dump persisted in backup dirs"
PLAINTEXT="$(find "$LOCAL_DIR" "$REMOTE_PATH" -type f ! -name '*.dump.age' 2>/dev/null)"
[[ -z "$PLAINTEXT" ]] || { echo "FAIL: plaintext file found in backup dirs: $PLAINTEXT" >&2; exit 1; }

echo "== verifying archive with deploy/restore.sh --verify"
bash "$RESTORE_SH" --verify "$LOCAL_DIR/$ENCRYPTED_FILE" --identity "$WORK/identity.txt" \
  --container "$SOURCE_CONTAINER"

echo "== starting throwaway postgres target ($POSTGRES_IMAGE)"
docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$TARGET_CONTAINER" \
  -e "POSTGRES_USER=$TARGET_USER" \
  -e "POSTGRES_PASSWORD=$TARGET_PASSWORD" \
  -e "POSTGRES_DB=$TARGET_DB" \
  "$POSTGRES_IMAGE" >/dev/null
READY=0
for _ in {1..60}; do
  if docker exec "$TARGET_CONTAINER" pg_isready -U "$TARGET_USER" -d "$TARGET_DB" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
[[ "$READY" == 1 ]] || { echo "FAIL: throwaway database never became ready" >&2; exit 1; }

echo "== restoring into throwaway target with deploy/restore.sh"
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$LOCAL_DIR/$ENCRYPTED_FILE" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target

echo "== validating parity (source vs restored)"
PARITY_FAIL=0
CANDIDATES="products orders payments admin_users audit_events customer_accounts product_image_metadata product_image_manifest payment_activation_grants"
for t in $CANDIDATES; do
  src=$(docker exec -e "PGPASSWORD=$SOURCE_PASSWORD" "$SOURCE_CONTAINER" \
        psql -At -U "$SOURCE_USER" -d "$SOURCE_DB" -c "SELECT count(*) FROM $t" 2>/dev/null || true)
  if [[ -z "$src" ]]; then
    continue
  fi
  dst=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
        psql -At -U "$TARGET_USER" -d "$TARGET_DB" -c "SELECT count(*) FROM $t" 2>/dev/null || true)
  if [[ "$src" == "$dst" ]]; then
    echo "  parity $t: $src = $dst OK"
  else
    echo "  MISMATCH $t: source=$src restored=$dst" >&2
    PARITY_FAIL=1
  fi
done

src_tables=$(docker exec -e "PGPASSWORD=$SOURCE_PASSWORD" "$SOURCE_CONTAINER" \
  psql -At -U "$SOURCE_USER" -d "$SOURCE_DB" \
  -c "SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || true)
dst_tables=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -At -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || true)
if [[ "$src_tables" == "$dst_tables" ]]; then
  echo "  schema surface parity OK ($(tr ',' '\n' <<<"$src_tables" | wc -l) tables)"
else
  echo "  MISMATCH schema surface: source differs from restored" >&2
  PARITY_FAIL=1
fi

src_ledger=$(docker exec -e "PGPASSWORD=$SOURCE_PASSWORD" "$SOURCE_CONTAINER" \
  psql -At -U "$SOURCE_USER" -d "$SOURCE_DB" -c "SELECT count(*) FROM app_schema_migrations" 2>/dev/null || echo "absent")
dst_ledger=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -At -U "$TARGET_USER" -d "$TARGET_DB" -c "SELECT count(*) FROM app_schema_migrations" 2>/dev/null || echo "absent")
echo "  migration ledger: source=$src_ledger restored=$dst_ledger"
if [[ "$src_ledger" != "$dst_ledger" ]]; then
  echo "  MISMATCH migration ledger" >&2
  PARITY_FAIL=1
fi

readiness='SELECT payments.provider, payments.provider_request_id, orders.stock_released_at, products.source_item_code, product_reviews.id, shipping_services.code, shipping_service_rates.shipping_class, order_shipping_addresses.order_id, shipments.id, customer_sessions.user_agent, admin_sessions.mfa_verified_at, admin_mfa_factors.admin_user_id, customer_mfa_factors.customer_account_id FROM payments CROSS JOIN orders CROSS JOIN products CROSS JOIN shipping_services CROSS JOIN shipping_service_rates CROSS JOIN order_shipping_addresses CROSS JOIN shipments CROSS JOIN customer_sessions CROSS JOIN admin_sessions CROSS JOIN admin_mfa_factors CROSS JOIN customer_mfa_factors LEFT JOIN product_reviews ON product_reviews.product_id = products.id LIMIT 0'
if docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
    psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" -c "$readiness" >/dev/null 2>&1; then
  echo "  readiness schema check PASS"
else
  echo "  FAIL readiness schema check" >&2
  PARITY_FAIL=1
fi

echo "== destroying throwaway target"
docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1

if [[ "$PARITY_FAIL" == 1 ]]; then
  echo "RESTORE PROOF: FAIL" >&2
  exit 1
fi

echo "RESTORE PROOF: PASS"
exit 0