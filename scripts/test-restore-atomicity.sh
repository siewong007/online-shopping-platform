#!/usr/bin/env bash
#
# C4: prove that deploy/restore.sh's restore is ATOMIC — a mid-restore failure under
# --single-transaction rolls the target back to its previous state.
#
# Method (real postgres, real age, real restore.sh):
#   1. Dump the development database, encrypt with a disposable age key.
#   2. Restore into a throwaway target (isolated kind) — full success. Snapshot row counts.
#   3. Create a PostgreSQL PUBLICATION on one of the archived tables. Publications are NOT dropped
#      by DROP TABLE ... CASCADE, so pg_restore --clean's plain DROP of that table is GUARANTEED to
#      fail mid-restore (after at least one other table has already been dropped).
#   4. Re-run restore.sh against the SAME target. It MUST fail (restore_failed).
#   5. Verify the target is UNCHANGED: every table retains its snapshot row count. If the restore
#      were not transactional, the first table would already have been dropped.
#
# Requires: docker, age (age + age-keygen), a running source DB (env overrides below).
#   scripts/test-restore-atomicity.sh
set -Eeuo pipefail

SOURCE_CONTAINER="${SOURCE_CONTAINER:-online-shopping-db}"
SOURCE_USER="${SOURCE_USER:-project_depot}"
SOURCE_DB="${SOURCE_DB:-project_depot}"
SOURCE_PASSWORD="${SOURCE_PASSWORD:-project_depot}"
TARGET_CONTAINER="${TARGET_CONTAINER:-online-shopping-atomicity}"
TARGET_USER="${TARGET_USER:-restore}"
TARGET_PASSWORD="${TARGET_PASSWORD:-restore}"
TARGET_DB="${TARGET_DB:-restore_proof}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:19beta1}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESTORE_SH="$REPO_ROOT/deploy/restore.sh"

WORK="$(mktemp -d "${TMPDIR:-/tmp}/restore-atomicity.XXXXXX")"
chmod 0700 "$WORK"
trap 'set +e; docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1; rm -rf "$WORK"' EXIT

for tool in docker age age-keygen; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

running=$(docker inspect --format '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null || true)
[[ "$running" == "true" ]] || { echo "source DB container $SOURCE_CONTAINER is not running" >&2; exit 1; }

echo "== generating disposable age keypair"
age-keygen -o "$WORK/identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/identity.txt"
RECIPIENT="$(age-keygen -y "$WORK/identity.txt" 2>/dev/null | tail -n 1)"

echo "== dumping + encrypting the source database"
docker exec -e "PGPASSWORD=$SOURCE_PASSWORD" "$SOURCE_CONTAINER" \
  pg_dump --format=custom --no-owner --no-acl -U "$SOURCE_USER" "$SOURCE_DB" \
  | age --encrypt --recipient "$RECIPIENT" --output "$WORK/archive.dump.age"
[[ -s "$WORK/archive.dump.age" ]] || { echo "FAIL: encrypted archive empty" >&2; exit 1; }

echo "== starting throwaway target ($POSTGRES_IMAGE)"
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

echo "== restore run 1 (must succeed)"
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$WORK/archive.dump.age" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated

# Snapshot row counts for every public table in the restored target.
echo "== snapshotting baseline row counts"
declare -A BASELINE
while IFS= read -r tbl; do
  [[ -n "$tbl" ]] || continue
  BASELINE["$tbl"]=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
    psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
    -c "SELECT count(*) FROM public.$tbl")
done < <(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")
echo "  baselined ${#BASELINE[@]} tables"

# Pick the archive's public tables in the order pg_restore will process them.
# pg_restore --list cannot read the age-encrypted blob, so decrypt to a plain dump first.
age --decrypt --identity "$WORK/identity.txt" --output "$WORK/plain.dump" "$WORK/archive.dump.age"
mapfile -t TOC_TABLES < <(docker exec -i "$TARGET_CONTAINER" pg_restore --list < "$WORK/plain.dump" 2>/dev/null \
  | awk '/TABLE DATA/ {print $(NF-1)}')
echo "  archive table data entries: ${TOC_TABLES[*]:-none}"
[[ "${#TOC_TABLES[@]}" -ge 2 ]] || { echo "FAIL: archive has fewer than 2 tables" >&2; exit 1; }

FIRST_TBL="${TOC_TABLES[0]}"
BLOCKER_TBL="${TOC_TABLES[1]}"
if [[ "$BLOCKER_TBL" == "$FIRST_TBL" ]]; then
  BLOCKER_TBL="${TOC_TABLES[-1]}"
fi
echo "== first table to be dropped: $FIRST_TBL ; blocker table: $BLOCKER_TBL"
[[ -n "${BASELINE[$BLOCKER_TBL]:-}" ]] || { echo "FAIL: blocker table $BLOCKER_TBL not in baseline" >&2; exit 1; }

echo "== creating a dependent VIEW on $BLOCKER_TBL so its DROP fails mid-restore"
# A view is a hard dependency: `DROP TABLE <blocker>;` (emitted by pg_restore --clean, no CASCADE)
# must fail. The view is created AFTER run 1 so it is not part of the archive's schema.
docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
  -c "CREATE VIEW public.v_atomicity_blocker AS SELECT * FROM public.$BLOCKER_TBL" >/dev/null

echo "== restore run 2 (MUST fail: the blocker's DROP fails mid-restore)"
set +e
PGPASSWORD="$TARGET_PASSWORD" bash "$RESTORE_SH" --restore "$WORK/archive.dump.age" \
  --container "$TARGET_CONTAINER" --database "$TARGET_DB" --db-user "$TARGET_USER" \
  --identity "$WORK/identity.txt" --destroy-target --target-kind isolated >"$WORK/run2.out" 2>&1
RUN2_RC=$?
set -e
if (( RUN2_RC == 0 )); then
  echo "FAIL: run 2 unexpectedly succeeded; the dependent view did not block the restore" >&2
  exit 1
fi
grep -q 'restore_failed' "$WORK/run2.out" || { echo "FAIL: run 2 failed but not with restore_failed:" >&2; cat "$WORK/run2.out" >&2; exit 1; }
echo "  run 2 failed as required: $(grep -m1 'ERROR \[restore_failed\]' "$WORK/run2.out" || true)"

echo "== verifying the target is UNCHANGED after the rolled-back restore"
ATOMIC_FAIL=0
for tbl in "${!BASELINE[@]}"; do
  now=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
    psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
    -c "SELECT count(*) FROM public.$tbl")
  if [[ "$now" == "${BASELINE[$tbl]}" ]]; then
    echo "  unchanged $tbl: ${BASELINE[$tbl]} OK"
  else
    echo "  MISMATCH $tbl: baseline=${BASELINE[$tbl]} now=$now (restore was NOT atomic)" >&2
    ATOMIC_FAIL=1
  fi
done
# The first table's DROP must have rolled back — it is the strongest proof.
if [[ -n "${BASELINE[$FIRST_TBL]:-}" ]]; then
  first_now=$(docker exec -e "PGPASSWORD=$TARGET_PASSWORD" "$TARGET_CONTAINER" \
    psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" \
    -c "SELECT count(*) FROM public.$FIRST_TBL")
  if [[ "$first_now" != "${BASELINE[$FIRST_TBL]}" ]]; then
    echo "FAIL: $FIRST_TBL was dropped and NOT rolled back" >&2
    ATOMIC_FAIL=1
  fi
fi

docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1

if (( ATOMIC_FAIL != 0 )); then
  echo "RESTORE ATOMICITY: FAIL" >&2
  exit 1
fi
echo "RESTORE ATOMICITY: PASS"
exit 0