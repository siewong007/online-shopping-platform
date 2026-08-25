#!/usr/bin/env bash
#
# C3 negative tests: prove that a "restore proof" CANNOT pass when the target is empty, damaged,
# or the source cannot be read. Each case is expected to FAIL (nonzero exit).
#
#   1. rp_empty         - throwaway target that was never restored -> parity MUST fail.
#   2. rp_damaged       - a full backup+restore, then damage orders/products in the target
#                         -> row-count and content-fingerprint parity MUST fail.
#   3. rp_wrong_source  - backup.sh with an unreadable source database -> MUST fail (dump_failed),
#                         status must record the failure (never a stale ok).
#
# Uses the REAL deploy/backup.sh, deploy/restore.sh and the parity stage of restore-proof.sh
# (RP_ONLY_PARITY=1) against throwaway containers. Requires: bash, docker, age, age-keygen, rclone.
#   scripts/test-restore-proof-negative.sh
set -Eeuo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-online-shopping-db}"
SOURCE_USER="${SOURCE_USER:-project_depot}"
SOURCE_DB="${SOURCE_DB:-project_depot}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-project_depot}"
TARGET_USER="${TARGET_USER:-restore}"
TARGET_PASSWORD="${TARGET_PASSWORD:-restore}"
TARGET_DB="${TARGET_DB:-restore_proof}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:19beta3}"
TARGET_CONTAINER="${TARGET_CONTAINER:-online-shopping-restore-proof-neg}"
# D5: the canonical production container identity, overridable ONLY by tests to prove the
# fail-closed refusal when production cannot be resolved (the override never widens safety).
RP_PROD_CONTAINER="${RP_PROD_CONTAINER:-online-shopping-db}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SH="$REPO_ROOT/deploy/backup.sh"
RESTORE_SH="$REPO_ROOT/deploy/restore.sh"
RESTORE_PROOF_SH="$REPO_ROOT/scripts/restore-proof.sh"
# M1: the shared fail-closed cleanup rule (deploy/backup-capacity.sh) — ONE definition for all
# proof/atomicity harnesses.
# shellcheck disable=SC1091,SC1090
if ! source "$REPO_ROOT/deploy/backup-capacity.sh" 2>/dev/null; then
  echo "ERROR: backup-capacity.sh is missing; refusing to run without the shared fail-closed cleanup rule" >&2
  exit 1
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/restore-proof-neg.XXXXXX")"
chmod 0700 "$WORK"
PASS=0
FAIL=0

assert_non_production_target() {
  local target="$1"
  if [[ "$target" == "$RP_PROD_CONTAINER" ]]; then
    echo "ERROR: target container name '$target' is the canonical production container; refusing to run" >&2
    exit 1
  fi
  local target_id prod_id
  target_id=$(docker inspect --format '{{.Id}}' "$target" 2>/dev/null | tr -d ' \r\n' || true)
  # N1/D5: FAIL CLOSED — if the PRODUCTION container identity cannot be resolved, this run cannot
  # prove the target is not production, so it refuses instead of assuming safety. Runs BEFORE any
  # docker rm/run.
  prod_id=$(docker inspect --format '{{.Id}}' "$RP_PROD_CONTAINER" 2>/dev/null | tr -d ' \r\n' || true)
  if [[ -z "$prod_id" ]]; then
    echo "ERROR: cannot resolve the production container '$RP_PROD_CONTAINER' by docker; refusing a restore that cannot prove its target is not production" >&2
    exit 1
  fi
  if [[ -n "$target_id" && "$target_id" == "$prod_id" ]]; then
    echo "ERROR: target container '$target' resolves to the production container ID; refusing to run" >&2
    exit 1
  fi
}

# shellcheck disable=SC2317,SC2329
cleanup() {
  set +e
  # M1: remove the throwaway target ONLY when both identities resolve and are proven DIFFERENT
  # (shared safe_rm_target). If either identity is unresolvable or they are equal, delete
  # NOTHING — a fail-closed refusal must never become a destructive docker rm of a
  # possibly-production target.
  safe_rm_target "${TARGET_CONTAINER:-}"
  if [[ -n "${WORK:-}" && -d "$WORK" ]]; then
    rm -rf -- "$WORK"
  fi
}
trap cleanup EXIT

# Check safety immediately
assert_non_production_target "$TARGET_CONTAINER"

for tool in docker age age-keygen rclone; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

running=$(docker inspect --format '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null || true)
[[ "$running" == "true" ]] || { echo "source DB container $SOURCE_CONTAINER is not running" >&2; exit 1; }

# --- shared: disposable age keypair + local-type rclone remote --------------------------------
age-keygen -o "$WORK/identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/identity.txt"
RECIPIENT="$(age-keygen -y "$WORK/identity.txt" 2>/dev/null | tail -n 1)"
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

write_env() {
  cat > "$WORK/backup.env"
  chmod 0600 "$WORK/backup.env"
}
export BACKUP_APP_DIR="$APP_DIR"
export BACKUP_CONFIG_FILE="$WORK/backup.env"
export BACKUP_STATUS_FILE="$APP_DIR/backup-status.json"
export BACKUP_LOCK_FILE="$APP_DIR/backup.lock"

wait_ready() {
  local i=0
  while (( i < 60 )); do
    # pg_isready succeeds during the image's temporary initdb server (before the target
    # database exists), so poll for an actual query on the target database instead.
    if PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
        psql -At -U "$TARGET_USER" -d "$TARGET_DB" -c 'SELECT 1' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

start_target() {
  assert_non_production_target "$TARGET_CONTAINER"
  docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
  docker run -d --name "$TARGET_CONTAINER" \
    -e "POSTGRES_USER=$TARGET_USER" \
    -e "POSTGRES_PASSWORD=$TARGET_PASSWORD" \
    -e "POSTGRES_DB=$TARGET_DB" \
    "$POSTGRES_IMAGE" >/dev/null
  wait_ready || { echo "FAIL: target never became ready" >&2; exit 1; }
}

expect_fail() {
  local name="$1" rc=0
  shift
  set +e
  "$@" >"$WORK/.out" 2>&1
  rc=$?
  set -e
  if (( rc != 0 )); then
    PASS=$((PASS + 1)); echo "ok:   $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name (expected nonzero, got 0)"; sed 's/^/      /' "$WORK/.out" | head -n 20
  fi
}

# N7: shared helper — fresh app/local/remote + a REAL backup of the source database; prints the
# archive path AND the remote path of the same archive.
make_archive() {
  rm -rf "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
  mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
  write_env <<EOF
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
  bash "$BACKUP_SH" >/dev/null 2>&1 || { echo "FAIL: backup.sh failed in case setup" >&2; exit 1; }
  local name
  name=$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$APP_DIR/backup-status.json" | head -n 1)
  [[ -f "$LOCAL_DIR/$name" ]] || { echo "FAIL: archive missing after backup" >&2; exit 1; }
  printf '%s\n' "$LOCAL_DIR/$name"
}

# --- case 1: empty target ----------------------------------------------------------------------
echo "== case 1: restore proof against an EMPTY target must fail"
start_target
expect_fail "rp_empty_target_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -q 'PARITY: FAIL' "$WORK/.out" || { echo "FAIL: empty-target case did not print PARITY: FAIL"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 2: damaged target --------------------------------------------------------------------
echo "== case 2: full backup + restore, then damage, proof must fail"
rm -rf "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
write_env <<EOF
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
bash "$BACKUP_SH" >/dev/null 2>&1 || { echo "FAIL: backup.sh failed in damaged case setup" >&2; exit 1; }
ARCHIVE="$LOCAL_DIR/$(sed -n 's/.*"filename": "\([^"]*\)".*/\1/p' "$APP_DIR/backup-status.json" | head -n 1)"
[[ -f "$ARCHIVE" ]] || { echo "FAIL: archive missing" >&2; exit 1; }
start_target
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >/dev/null

# Damage: delete rows from orders and mutate a row in products. The delete removes at least one
# row regardless of source data (positive business data is guaranteed).
# M3/N-H3: passwords forwarded by NAME only, never in the host argv.
PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "DELETE FROM public.orders WHERE id = (SELECT min(id) FROM public.orders)" >/dev/null
PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "UPDATE public.products SET source_item_code = source_item_code || '-damaged' WHERE id = (SELECT min(id) FROM public.products)" >/dev/null

expect_fail "rp_damaged_target_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -qE 'MISMATCH|mismatch' "$WORK/.out" || { echo "FAIL: damaged case did not report a parity mismatch"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 3: wrong source credentials -----------------------------------------------------------
echo "== case 3: backup.sh against an unreadable source must fail (no stale ok)"
rm -rf "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
mkdir -p "$APP_DIR" "$LOCAL_DIR" "$REMOTE_PATH"
write_env <<EOF
BACKUP_AGE_RECIPIENT=$RECIPIENT
BACKUP_RCLONE_REMOTE=$REMOTE_NAME
BACKUP_RCLONE_PATH=$REMOTE_PATH
BACKUP_LOCAL_DIR=$LOCAL_DIR
BACKUP_DB_CONTAINER=$SOURCE_CONTAINER
BACKUP_DB_USER=$SOURCE_USER
BACKUP_DB_NAME=no_such_database
EOF
expect_fail "rp_wrong_source_db_fails" bash "$BACKUP_SH"
if grep -q '"error_category": "dump_failed"' "$APP_DIR/backup-status.json"; then
  PASS=$((PASS + 1)); echo "ok:   rp_wrong_source_records_dump_failed"
else
  FAIL=$((FAIL + 1)); echo "FAIL: rp_wrong_source_records_dump_failed (status: $(cat "$APP_DIR/backup-status.json" 2>/dev/null || echo missing))"
fi
grep -q '"status": "ok"' "$APP_DIR/backup-status.json" && { echo "FAIL: wrong-source run left a stale ok"; FAIL=$((FAIL+1)); }

# --- case 4: wrong identity ----------------------------------------------------------------------
echo "== case 4: restore with a WRONG age identity must fail at decrypt"
ARCHIVE4="$(make_archive)"
start_target
age-keygen -o "$WORK/wrong-identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/wrong-identity.txt"
expect_fail "rp_wrong_identity_fails" \
  env PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE4" \
      --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
      --identity "$WORK/wrong-identity.txt" --destroy-target --target-kind isolated
grep -q 'decrypt_failed' "$WORK/.out" || { echo "FAIL: wrong-identity case did not report decrypt_failed"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 5: corrupted remote archive -------------------------------------------------------------
echo "== case 5: a CORRUPTED remote archive (provider-side damage) must fail"
ARCHIVE5="$(make_archive)"
# Corrupt the REMOTE copy (the object the provider actually holds) and re-download it.
REMOTE5="$REMOTE_PATH/$(basename "$ARCHIVE5")"
printf 'CORRUPTION-APPENDED-BY-PROVIDER\n' >> "$REMOTE5"
rclone copy --contimeout 15s --timeout 120s "$REMOTE_NAME:$REMOTE_PATH/$(basename "$ARCHIVE5")" "$WORK/download5/"
start_target
expect_fail "rp_corrupted_remote_fails" \
  env PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$WORK/download5/$(basename "$ARCHIVE5")" \
      --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
      --identity "$WORK/identity.txt" --destroy-target --target-kind isolated
grep -qE 'decrypt_failed|archive_not_restorable' "$WORK/.out" || { echo "FAIL: corrupted-remote case did not report decrypt_failed/archive_not_restorable"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 6: truncated remote archive -------------------------------------------------------------
echo "== case 6: a TRUNCATED remote archive must fail"
ARCHIVE6="$(make_archive)"
head -c 100 "$REMOTE_PATH/$(basename "$ARCHIVE6")" > "$WORK/truncated6.dump.age"
start_target
expect_fail "rp_truncated_remote_fails" \
  env PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$WORK/truncated6.dump.age" \
      --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
      --identity "$WORK/identity.txt" --destroy-target --target-kind isolated
grep -qE 'decrypt_failed|archive_not_restorable' "$WORK/.out" || { echo "FAIL: truncated-remote case did not report decrypt_failed/archive_not_restorable"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 7: same row counts, different content ----------------------------------------------------
echo "== case 7: SAME row counts but different content must fail the content fingerprint"
ARCHIVE7="$(make_archive)"
start_target
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE7" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >/dev/null
PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "UPDATE public.products SET source_item_code = source_item_code || '-content-mutated-' || id::text" >/dev/null
expect_fail "rp_same_count_content_changed_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -qE 'MISMATCH|mismatch' "$WORK/.out" || { echo "FAIL: same-count-content case did not report a parity mismatch"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 8: schema mismatch ----------------------------------------------------------------------
echo "== case 8: a SCHEMA mismatch (column dropped from products) must fail"
ARCHIVE8="$(make_archive)"
start_target
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE8" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >/dev/null
# Drop the first non-id column of products — row counts stay identical; the schema surface differs.
DROPPED_COL=$(PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='products' AND column_name <> 'id' ORDER BY ordinal_position LIMIT 1" | tr -d ' \r')
[[ -n "$DROPPED_COL" ]] || { echo "FAIL: no droppable column found in products" >&2; exit 1; }
PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "DO \$\$ BEGIN EXECUTE 'ALTER TABLE public.products DROP COLUMN \"' || '$DROPPED_COL' || '\"'; END \$\$;" >/dev/null
expect_fail "rp_schema_mismatch_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -qE 'schema|column|MISMATCH|mismatch' "$WORK/.out" || { echo "FAIL: schema-mismatch case did not report a schema/parity mismatch"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 9: migration-ledger mismatch -------------------------------------------------------------
echo "== case 9: a MIGRATION-LEDGER mismatch must fail"
ARCHIVE9="$(make_archive)"
start_target
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$ARCHIVE9" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >/dev/null
PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "DELETE FROM public.app_schema_migrations WHERE version = (SELECT min(version) FROM public.app_schema_migrations)" >/dev/null
expect_fail "rp_ledger_mismatch_fails" \
  env RP_ONLY_PARITY=1 \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -qE 'migration|ledger|MISMATCH|mismatch' "$WORK/.out" || { echo "FAIL: ledger-mismatch case did not report a ledger/migration mismatch"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

# --- case 10: D5 — production identity UNRESOLVABLE -> every proof script refuses BEFORE any
# docker rm/run (mirrors restore.sh's fail-closed target_resolution_failed). RP_PROD_CONTAINER is
# a TEST-ONLY override pointing at a name docker cannot resolve; the refusal must happen at the
# very first assert, before any container is removed or created.
echo "== case 10: proof scripts refuse when the production container cannot be resolved"
expect_fail "rp_prod_unresolvable_restore_proof_refuses" \
  env RP_ONLY_PARITY=1 \
      RP_PROD_CONTAINER="online-shopping-db-does-not-exist" \
      SOURCE_CONTAINER="$SOURCE_CONTAINER" SOURCE_USER="$SOURCE_USER" SOURCE_DB="$SOURCE_DB" SOURCE_PASSWORD="$SOURCE_PASSWORD" \
      TARGET_CONTAINER="$TARGET_CONTAINER" TARGET_USER="$TARGET_USER" TARGET_PASSWORD="$TARGET_PASSWORD" TARGET_DB="$TARGET_DB" \
      bash "$RESTORE_PROOF_SH"
grep -q 'cannot resolve the production container' "$WORK/.out" \
  || { echo "FAIL: restore-proof did not refuse with the resolution message"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

expect_fail "rp_prod_unresolvable_atomicity_refuses" \
  env RP_PROD_CONTAINER="online-shopping-db-does-not-exist" \
      bash "$REPO_ROOT/scripts/test-restore-atomicity.sh"
grep -q 'cannot resolve the production container' "$WORK/.out" \
  || { echo "FAIL: test-restore-atomicity did not refuse with the resolution message"; sed 's/^/      /' "$WORK/.out" | head -n 20; FAIL=$((FAIL+1)); }

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "RESTORE-PROOF-NEGATIVE: FAIL"
  exit 1
fi
echo "RESTORE-PROOF-NEGATIVE: PASS"
exit 0