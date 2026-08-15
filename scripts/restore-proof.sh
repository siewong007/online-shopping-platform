#!/usr/bin/env bash
#
# Non-destructive restore proof for the online-shopping encrypted backup pipeline.
#
#   local DB ──► pg_dump ──► age encrypt ──► rclone copy ──► (simulated off-server) ──►
#   download remote object ──► age decrypt ──► pg_restore into a THROWAWAY postgres container
#   ──► strict parity validation ──► destroy
#
# The archive that is restored is the one DOWNLOADED BACK from the simulated off-server remote
# (M11): after the upload is verified, the local copy is deleted so the restore provably uses the
# remote object, not the local file.
#
# Validation is FAIL CLOSED (C3). Every psql query runs with ON_ERROR_STOP=1 and a query error is
# a hard failure — nothing is swallowed with `|| true`. The proof requires:
#   - a non-empty source result for every table it compares,
#   - positive business data (orders, products, customer_accounts, admin_users each > 0),
#   - at least MIN_COMPARED_TABLES row-count comparisons,
#   - exact row-count parity AND a deterministic content fingerprint (md5 over the sorted
#     row_to_json rows) for every compared table,
#   - exact schema-surface parity and migration-ledger parity,
#   - the restore.sh readiness schema check.
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
#
# Re-check mode for negative tests:
#   RP_ONLY_PARITY=1  skip backup/restore; run ONLY the parity validation against the SOURCE_*
#                     and TARGET_* containers named in the environment (used to prove a damaged or
#                     empty target FAILS the proof).
set -Eeuo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-online-shopping-db}"
SOURCE_USER="${SOURCE_USER:-project_depot}"
SOURCE_DB="${SOURCE_DB:-project_depot}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-project_depot}"

TARGET_CONTAINER="${TARGET_CONTAINER:-online-shopping-restore-proof}"
TARGET_USER="${TARGET_USER:-restore}"
TARGET_PASSWORD="${TARGET_PASSWORD:-restore}"
TARGET_DB="${TARGET_DB:-restore_proof}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:19beta1}"

MIN_COMPARED_TABLES="${MIN_COMPARED_TABLES:-6}"
CANDIDATES="products orders payments admin_users audit_events customer_accounts product_image_metadata product_image_manifest payment_activation_grants"
POSITIVE_TABLES="orders products customer_accounts admin_users"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SH="$REPO_ROOT/deploy/backup.sh"
RESTORE_SH="$REPO_ROOT/deploy/restore.sh"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/restore-proof.XXXXXX")"
chmod 0700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

req() {
  local tool
  for tool in "$@"; do
    command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
  done
}

# Strict psql helpers: ON_ERROR_STOP=1, nothing swallowed, stderr shown on failure.
src_psql() { docker exec -e "PGPASSWORD=$SOURCE_PASSWORD" "$SOURCE_CONTAINER" \
  psql -At -v ON_ERROR_STOP=1 -U "$SOURCE_USER" -d "$SOURCE_DB" -c "$1"; }
dst_psql() { docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" -c "$1"; }

# Deterministic content fingerprint: sorted row_to_json rows md5'd. Ordering by the JSON text
# makes the result independent of physical row order.
table_fingerprint() {
  local container="$1" password="$2" user="$3" db="$4" table="$5"
  # COALESCE: an empty table fingerprints to a fixed sentinel on both sides, so parity holds
  # for 0-row tables instead of producing NULL (empty) on both and failing the -n check.
  docker exec -e "PGPASSWORD=$password" "$container" \
    psql -At -v ON_ERROR_STOP=1 -U "$user" -d "$db" -c \
    "SELECT COALESCE(md5(string_agg(row_to_json(x)::text, E'\\n' ORDER BY row_to_json(x)::text)), 'md5:empty') FROM (SELECT * FROM $table) x"
}

PARITY_FAIL=0
rp_fail() {
  echo "  FAIL $*" >&2
  PARITY_FAIL=1
}

parity_validation() {
  # Requires the SOURCE_* and TARGET_* containers to be reachable. Used both by the full proof and
  # by RP_ONLY_PARITY=1 re-checks against a deliberately damaged/empty target.
  echo "== validating parity (source vs restored; fail closed)"
  local t src_table_exists dst_table_exists src dst cmp=0
  for t in $CANDIDATES; do
    src_table_exists=$(src_psql "SELECT to_regclass('public.$t') IS NOT NULL") || { rp_fail "source query errored for $t"; continue; }
    [[ "$src_table_exists" == "t" ]] || continue
    dst_table_exists=$(dst_psql "SELECT to_regclass('public.$t') IS NOT NULL") || { rp_fail "target query errored for $t"; continue; }
    if [[ "$dst_table_exists" != "t" ]]; then
      rp_fail "$t missing from the restored schema"
      continue
    fi
    src=$(src_psql "SELECT count(*) FROM $t") || { rp_fail "source count errored for $t"; continue; }
    dst=$(dst_psql "SELECT count(*) FROM $t") || { rp_fail "target count errored for $t"; continue; }
    if [[ -z "$src" || -z "$dst" ]]; then
      rp_fail "$t returned an empty count (source='$src' target='$dst')"
      continue
    fi
    cmp=$((cmp + 1))
    if [[ "$src" == "$dst" ]]; then
      echo "  parity $t: $src = $dst OK"
    else
      rp_fail "$t row count mismatch: source=$src restored=$dst"
    fi

    local src_fp dst_fp
    src_fp=$(table_fingerprint "$SOURCE_CONTAINER" "$SOURCE_PASSWORD" "$SOURCE_USER" "$SOURCE_DB" "$t") \
      || { rp_fail "source content fingerprint errored for $t"; continue; }
    dst_fp=$(table_fingerprint "$TARGET_CONTAINER" "$TARGET_PASSWORD" "$TARGET_USER" "$TARGET_DB" "$t") \
      || { rp_fail "target content fingerprint errored for $t"; continue; }
    if [[ -n "$src_fp" && "$src_fp" == "$dst_fp" ]]; then
      echo "  content $t: fingerprint match OK"
    else
      rp_fail "$t content fingerprint mismatch (source=$src_fp restored=$dst_fp)"
    fi
  done
  if (( cmp < MIN_COMPARED_TABLES )); then
    rp_fail "only $cmp tables compared; need at least $MIN_COMPARED_TABLES"
  else
    echo "  compared $cmp tables (min $MIN_COMPARED_TABLES)"
  fi

  # Positive business data: an empty or schema-only restore can never pass.
  local p pv
  for p in $POSITIVE_TABLES; do
    pv=$(src_psql "SELECT count(*) FROM $p") || { rp_fail "source positivity query errored for $p"; continue; }
    if [[ -n "$pv" && "$pv" != "0" ]]; then
      echo "  business data $p: $pv rows OK"
    else
      rp_fail "source business table $p has zero rows; refusing to call an empty restore a proof"
    fi
  done

  local src_tables dst_tables src_ledger dst_ledger
  src_tables=$(src_psql "SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'") \
    || { rp_fail "source schema query errored"; }
  dst_tables=$(dst_psql "SELECT string_agg(table_name, ',' ORDER BY table_name) FROM information_schema.tables WHERE table_schema='public'") \
    || { rp_fail "target schema query errored"; }
  if [[ -n "$src_tables" && "$src_tables" == "$dst_tables" ]]; then
    echo "  schema surface parity OK ($(tr ',' '\n' <<<"$src_tables" | wc -l) tables)"
  else
    rp_fail "schema surface mismatch"
  fi

  src_ledger=$(src_psql "SELECT count(*) FROM app_schema_migrations") || { rp_fail "source ledger query errored"; }
  dst_ledger=$(dst_psql "SELECT count(*) FROM app_schema_migrations") || { rp_fail "target ledger query errored"; }
  echo "  migration ledger: source=$src_ledger restored=$dst_ledger"
  if [[ -z "$src_ledger" || -z "$dst_ledger" || "$src_ledger" != "$dst_ledger" ]]; then
    rp_fail "migration ledger mismatch"
  fi

  local readiness
  readiness='SELECT payments.provider, payments.provider_request_id, orders.stock_released_at, products.source_item_code, product_reviews.id, shipping_services.code, shipping_service_rates.shipping_class, order_shipping_addresses.order_id, shipments.id, customer_sessions.user_agent, admin_sessions.mfa_verified_at, admin_mfa_factors.admin_user_id, customer_mfa_factors.customer_account_id FROM payments CROSS JOIN orders CROSS JOIN products CROSS JOIN shipping_services CROSS JOIN shipping_service_rates CROSS JOIN order_shipping_addresses CROSS JOIN shipments CROSS JOIN customer_sessions CROSS JOIN admin_sessions CROSS JOIN admin_mfa_factors CROSS JOIN customer_mfa_factors LEFT JOIN product_reviews ON product_reviews.product_id = products.id LIMIT 0'
  if dst_psql "$readiness" >/dev/null 2>&1; then
    echo "  readiness schema check PASS"
  else
    rp_fail "readiness schema check"
  fi

  if [[ "$PARITY_FAIL" == 1 ]]; then
    echo "RESTORE PROOF PARITY: FAIL" >&2
    exit 1
  fi
  echo "RESTORE PROOF PARITY: PASS"
}

req docker age age-keygen rclone

if [[ "${RP_ONLY_PARITY:-0}" == "1" ]]; then
  # Re-check mode: the caller has already produced a target (possibly damaged or empty).
  parity_validation
  exit 0
fi

trap 'set +e; docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

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

# M2: verify the remote object by size AND MD5 before trusting it.
LOCAL_SIZE=$(stat -c %s "$LOCAL_DIR/$ENCRYPTED_FILE")
LOCAL_MD5=$(md5sum "$LOCAL_DIR/$ENCRYPTED_FILE" | awk '{print $1}')
REMOTE_MD5=$(rclone hashsum MD5 "$REMOTE_NAME:$REMOTE_PATH/$ENCRYPTED_FILE" 2>/dev/null | awk '{print $1}' | head -n 1)
if [[ -z "$REMOTE_MD5" || "$REMOTE_MD5" != "$LOCAL_MD5" ]]; then
  echo "FAIL: remote object hash mismatch (local=$LOCAL_MD5 remote=${REMOTE_MD5:-<none>})" >&2
  exit 1
fi
echo "== remote object verified: size $LOCAL_SIZE bytes, MD5 match"

echo "== confirming no plaintext dump persisted in backup dirs"
PLAINTEXT="$(find "$LOCAL_DIR" "$REMOTE_PATH" -type f ! -name '*.dump.age' 2>/dev/null)"
[[ -z "$PLAINTEXT" ]] || { echo "FAIL: plaintext file found in backup dirs: $PLAINTEXT" >&2; exit 1; }

echo "== verifying archive with deploy/restore.sh --verify"
bash "$RESTORE_SH" --verify "$LOCAL_DIR/$ENCRYPTED_FILE" --identity "$WORK/identity.txt" \
  --container "$SOURCE_CONTAINER"

# M11: delete the local copy, download the remote object, restore THAT copy.
echo "== downloading the remote object and restoring that copy (not the local file)"
DL_DIR="$WORK/downloaded"
mkdir -p "$DL_DIR"
rclone copy "$REMOTE_NAME:$REMOTE_PATH/$ENCRYPTED_FILE" "$DL_DIR/"
DOWNLOADED="$DL_DIR/$ENCRYPTED_FILE"
[[ -f "$DOWNLOADED" ]] || { echo "FAIL: remote object did not download" >&2; exit 1; }
DL_MD5=$(md5sum "$DOWNLOADED" | awk '{print $1}')
if [[ "$DL_MD5" != "$REMOTE_MD5" ]]; then
  echo "FAIL: downloaded object hash mismatch (remote=$REMOTE_MD5 downloaded=$DL_MD5)" >&2
  exit 1
fi
rm -f "$LOCAL_DIR/$ENCRYPTED_FILE"
echo "== restored archive is the downloaded remote object: $DOWNLOADED"

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

echo "== restoring into throwaway target with deploy/restore.sh (isolated kind)"
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$DOWNLOADED" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated

parity_validation

echo "== destroying throwaway target"
docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1

echo "RESTORE PROOF: PASS"
exit 0