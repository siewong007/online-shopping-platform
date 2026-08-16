#!/usr/bin/env bash
#
# C4: prove that deploy/restore.sh's restore is ATOMIC — a mid-restore failure under
# --single-transaction rolls the target back to its previous state.
#
# Method (real postgres, real age, real restore.sh):
#   1. Dump the development database, encrypt with a disposable age key.
#   2. Restore into a throwaway target (isolated kind) — full success. Snapshot row counts.
#   3. Create a PostgreSQL PUBLICATION / VIEW on one of the archived tables. Dependent objects
#      cause pg_restore --clean's plain DROP of that table to fail mid-restore.
#   4. Install a DDL-probe event trigger on the target: proves the first destructive DROP actually
#      executed inside the transaction before the blocker statement failed.
#   5. Re-run restore.sh against the SAME target. It MUST fail (restore_failed).
#   6. Verify the target is UNCHANGED: every table retains its snapshot row count. If the restore
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

assert_non_production_target() {
  local target="$1"
  if [[ "$target" == "online-shopping-db" ]]; then
    echo "ERROR: target container name '$target' is the canonical production container; refusing to run" >&2
    exit 1
  fi
  local target_id prod_id
  target_id=$(docker inspect --format '{{.Id}}' "$target" 2>/dev/null | tr -d ' \r\n' || true)
  # N1: FAIL CLOSED — if the PRODUCTION container identity cannot be resolved, this run cannot
  # prove the target is not production, so it refuses instead of assuming safety.
  prod_id=$(docker inspect --format '{{.Id}}' online-shopping-db 2>/dev/null | tr -d ' \r\n' || true)
  if [[ -z "$prod_id" ]]; then
    echo "ERROR: cannot resolve the production container 'online-shopping-db' by docker; refusing a restore that cannot prove its target is not production" >&2
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
  if [[ -n "${TARGET_CONTAINER:-}" && "$TARGET_CONTAINER" != "online-shopping-db" ]]; then
    local target_id prod_id
    target_id=$(docker inspect --format '{{.Id}}' "$TARGET_CONTAINER" 2>/dev/null | tr -d ' \r\n' || true)
    prod_id=$(docker inspect --format '{{.Id}}' online-shopping-db 2>/dev/null | tr -d ' \r\n' || true)
    if [[ -z "$target_id" || -z "$prod_id" || "$target_id" != "$prod_id" ]]; then
      docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
    fi
  fi
  if [[ -n "${WORK:-}" && -d "$WORK" ]]; then
    rm -rf -- "$WORK"
  fi
}
trap cleanup EXIT

# Check safety immediately
assert_non_production_target "$TARGET_CONTAINER"

for tool in docker age age-keygen; do
  command -v "$tool" >/dev/null 2>&1 || { echo "missing required tool: $tool" >&2; exit 1; }
done

# M3/N-H3: forward passwords to the container by NAME (`-e PGPASSWORD`), value exported for the
# docker client only — never in the host argv.
tgt_psql() { PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -At -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" -c "$1"; }
tgt_psql_v() { PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
  psql -v ON_ERROR_STOP=1 -U "$TARGET_USER" -d "$TARGET_DB" -c "$1"; }

running=$(docker inspect --format '{{.State.Running}}' "$SOURCE_CONTAINER" 2>/dev/null || true)
[[ "$running" == "true" ]] || { echo "source DB container $SOURCE_CONTAINER is not running" >&2; exit 1; }

echo "== generating disposable age keypair"
age-keygen -o "$WORK/identity.txt" >/dev/null 2>&1
chmod 0600 "$WORK/identity.txt"
RECIPIENT="$(age-keygen -y "$WORK/identity.txt" 2>/dev/null | tail -n 1)"

echo "== dumping + encrypting the source database"
PGPASSWORD="$SOURCE_PASSWORD" docker exec -e PGPASSWORD "$SOURCE_CONTAINER" \
  pg_dump --format=custom --no-owner --no-acl -U "$SOURCE_USER" "$SOURCE_DB" \
  | age --encrypt --recipient "$RECIPIENT" --output "$WORK/archive.dump.age"
[[ -s "$WORK/archive.dump.age" ]] || { echo "FAIL: encrypted archive empty" >&2; exit 1; }

echo "== starting throwaway target ($POSTGRES_IMAGE)"
assert_non_production_target "$TARGET_CONTAINER"
docker rm -f "$TARGET_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$TARGET_CONTAINER" \
  -e "POSTGRES_USER=$TARGET_USER" \
  -e "POSTGRES_PASSWORD=$TARGET_PASSWORD" \
  -e "POSTGRES_DB=$TARGET_DB" \
  "$POSTGRES_IMAGE" >/dev/null
READY=0
for _ in {1..60}; do
  # pg_isready succeeds during the image's temporary initdb server (before the target database
  # exists), so poll for an actual query on the target database instead.
  if PGPASSWORD="$TARGET_PASSWORD" docker exec -e PGPASSWORD "$TARGET_CONTAINER" \
      psql -At -U "$TARGET_USER" -d "$TARGET_DB" -c 'SELECT 1' >/dev/null 2>&1; then
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
  BASELINE["$tbl"]=$(tgt_psql "SELECT count(*) FROM public.$tbl")
done < <(tgt_psql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")
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
# pg_restore --clean issues table DROPs in REVERSE TOC order (most-dependent tables first), so
# the LAST archive table is dropped FIRST and the FIRST archive table is dropped LAST. The
# first-DROPPED table (LAST in the TOC) is therefore the strongest witness that the destructive
# DROPs really executed: if any drop executes, this one is among the very first.
LAST_DROPPED_TBL="${TOC_TABLES[-1]}"
echo "== first table to be dropped: $LAST_DROPPED_TBL ; blocker table: $BLOCKER_TBL"
[[ -n "${BASELINE[$BLOCKER_TBL]:-}" ]] || { echo "FAIL: blocker table $BLOCKER_TBL not in baseline" >&2; exit 1; }

echo "== creating a dependent VIEW on $BLOCKER_TBL so its DROP fails mid-restore"
# A view is a hard dependency: `DROP TABLE <blocker>;` (emitted by pg_restore --clean, no CASCADE)
# must fail. The view is created AFTER run 1 so it is not part of the archive's schema.
tgt_psql_v "CREATE VIEW public.v_atomicity_blocker AS SELECT * FROM public.$BLOCKER_TBL" >/dev/null

# N-H8: prove the DESTRUCTIVE DROPs actually EXECUTED, not merely "the final state equals the
# baseline". An event trigger on sql_drop appends one "DDL_PROBE DROP TABLE <table>" line per
# successful drop to /tmp/ddl-probe.log inside the target container (out-of-band: pg_restore
# discards all sub-ERROR server messages, so server-side notices can never prove this; the file
# write survives the rolled-back transaction). Asserting the probe file contains at least one
# "DDL_PROBE DROP TABLE public.<table>" line proves the destructive DROPs really executed inside
# the transaction (and were rolled back with it, per the parity checks below).
echo "== installing a DDL-probe event trigger on the target (post-run-1, not in the archive)"
# pg_event_trigger_dropped_objects() is only valid inside a sql_drop event trigger (in a
# ddl_command_end trigger it raises an error, which would abort the restore before the probe
# ever fires), so the probe listens on sql_drop. pg_restore DISCARDS every sub-ERROR server
# message via libpq's notice processor (NOTICE and WARNING never reach its stderr), so the probe
# is out-of-band: on each successful DROP TABLE it appends a line to /tmp/ddl-probe.log inside
# the target container via COPY ... TO PROGRAM. The file write is NOT transactional, so it
# survives the rolled-back restore and proves the DROPs really executed inside the transaction.
docker exec "$TARGET_CONTAINER" rm -f /tmp/ddl-probe.log
tgt_psql_v "CREATE FUNCTION public.f_ddl_probe() RETURNS event_trigger LANGUAGE plpgsql AS \$\$
DECLARE
  dropped text;
BEGIN
  IF tg_tag = 'DROP TABLE' THEN
    SELECT string_agg(object_identity, ',') INTO dropped FROM pg_event_trigger_dropped_objects();
    EXECUTE 'COPY (SELECT ''DDL_PROBE '' || ' || quote_literal(tg_tag) || ' || '' '' || ' || quote_literal(dropped) || ') TO PROGRAM ''cat >> /tmp/ddl-probe.log''';
  END IF;
END \$\$;" >/dev/null
tgt_psql_v "CREATE EVENT TRIGGER et_ddl_probe ON sql_drop EXECUTE FUNCTION public.f_ddl_probe();" >/dev/null

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
grep -q "DDL_PROBE DROP TABLE public." "$WORK/run2.out" \
  && { echo "FAIL: DDL probe fired in-band in run 2 (impossible for pg_restore)" >&2; exit 1; }
DDL_PROBE="$(docker exec "$TARGET_CONTAINER" cat /tmp/ddl-probe.log 2>/dev/null || true)"
grep -q "DDL_PROBE DROP TABLE public." <<<"$DDL_PROBE" \
  || { echo "FAIL: no table DROP executed inside the transaction (probe log empty):" >&2; echo "${DDL_PROBE:-<empty>}" >&2; exit 1; }
echo "  N-H8 proof: DDL probe log confirms destructive DROPs executed inside the transaction:"
echo "$DDL_PROBE" | grep 'DDL_PROBE' | sed 's/^/      /' | head -n 4

echo "== verifying the target is UNCHANGED after the rolled-back restore"
ATOMIC_FAIL=0
for tbl in "${!BASELINE[@]}"; do
  now=$(tgt_psql "SELECT count(*) FROM public.$tbl")
  if [[ "$now" == "${BASELINE[$tbl]}" ]]; then
    echo "  unchanged $tbl: ${BASELINE[$tbl]} OK"
  else
    echo "  MISMATCH $tbl: baseline=${BASELINE[$tbl]} now=$now (restore was NOT atomic)" >&2
    ATOMIC_FAIL=1
  fi
done
# The first table's DROP must have rolled back — it is the strongest proof.
if [[ -n "${BASELINE[$FIRST_TBL]:-}" ]]; then
  first_now=$(tgt_psql "SELECT count(*) FROM public.$FIRST_TBL")
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