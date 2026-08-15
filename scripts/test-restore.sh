#!/usr/bin/env bash
#
# Destructive-restore guardrail tests for deploy/restore.sh. Runs the real script against stub
# age/docker binaries so the guardrails (--destroy-target, --target-kind, production confirmation,
# strict identifier validation, atomicity flags) are exercised without touching a real database,
# key or archive.
#
# H7: the test is STRUCTURALLY incapable of reaching a real database: docker and age resolve only
# inside FAKEBIN (asserted below), and the production-permitted path is exercised with the
# decrypt-fails trick so pg_restore never runs against a production-named target.
#
# Requires: bash, coreutils. No age/rclone/docker needed.
# Run on any Linux host:  scripts/test-restore.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESTORE_SH="$ROOT/deploy/restore.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-restore.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

cat > "$FAKEBIN/age" <<'AGE'
#!/usr/bin/env bash
out=""
prev=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then
    out="$a"
  fi
  prev="$a"
done
if [[ "${FAKE_AGE_DECRYPT_FAIL:-0}" == "1" ]]; then
  echo "age: decryption failed (trap)" >&2
  exit 5
fi
printf 'age-encryption.org/v1\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${FAKEBIN_DIR:-/nonexistent}/docker-argv.log"
# docker exec [-i] [-e K=V] <container> <command> [args...] — find the <command>.
local_cmd() {
  local prev="" count=0 a
  for a in "$@"; do
    if [[ "$a" == "exec" || "$a" == "-i" ]]; then
      prev="$a"
      continue
    fi
    if [[ "$prev" == "-e" ]]; then
      prev=""
      continue
    fi
    if [[ "$a" == -* ]]; then
      prev="$a"
      continue
    fi
    count=$((count + 1))
    if [[ "$count" == 2 ]]; then
      printf '%s\n' "$a"
      return 0
    fi
  done
  return 1
}
cmd="$(local_cmd "$@")"
case "$cmd" in
  pg_restore)
    if [[ "${FAKE_PGRESTORE_LIST_FAIL:-0}" == "1" && "$*" == *"--list"* ]]; then
      echo "pg_restore --list failed" >&2
      exit 3
    fi
    if [[ "${FAKE_PGRESTORE_FAIL:-0}" == "1" && "$*" != *"--list"* ]]; then
      echo "pg_restore failed" >&2
      exit 3
    fi
    exit 0 ;;
  psql)
    if [[ "${FAKE_PSQL_FAIL:-0}" == "1" ]]; then
      echo "psql failed" >&2
      exit 3
    fi
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

export PATH="$FAKEBIN:$PATH"
export FAKEBIN_DIR="$FAKEBIN"
printf 'fake-custom-archive-bytes\n' > "$TMP/archive.dump.age"
printf 'age1fake-private-identity\n' > "$TMP/identity.txt"

# H7 independent fail-safe: the real tools must NOT be reachable from the test environment.
for tool in docker age; do
  resolved=$(PATH="$FAKEBIN" command -v "$tool")
  if [[ "$resolved" != "$FAKEBIN/$tool" ]]; then
    echo "FAIL: $tool resolves to $resolved, not $FAKEBIN/$tool — test can reach real tools"
    exit 1
  fi
done

run() {
  # run <name> <desc> <expected_rc> <expected_substring> <args...>
  local name="$1" desc="$2" expected_rc="$3" needle="$4"
  shift 4
  local rc=0
  : > "$FAKEBIN/docker-argv.log"
  set +e
  bash "$RESTORE_SH" "$@" >"$TMP/.out" 2>&1
  rc=$?
  set -e
  if [[ "$rc" == "$expected_rc" ]]; then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — expected rc $expected_rc, got $rc ($desc)"
    sed 's/^/      /' "$TMP/.out" | head -n 10
  fi
  if [[ -n "$needle" ]] && ! grep -qF -- "$needle" "$TMP/.out"; then
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — expected message containing '$needle'"
    sed 's/^/      /' "$TMP/.out" | head -n 10
  fi
}

A="$TMP/archive.dump.age"
I="$TMP/identity.txt"

# 1. No mode -> usage, exit 2
run "no_mode_usage" "default invocation must never restore" 2 "" "$A"

# 2. --verify without --container -> rejected (read-only, but needs an explicit target)
run "verify_requires_container" "--verify must name a container" 1 "missing_target" \
  --verify "$A" --identity "$I"

# 3. --restore without --destroy-target -> rejected before decrypt/restore
run "restore_requires_destroy_target" "--restore without --destroy-target refused" 1 "--destroy-target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --target-kind isolated --identity "$I"

# 4. --restore without --target-kind -> rejected (fail closed targeting, M8)
run "restore_requires_target_kind" "--restore without --target-kind refused" 1 "missing_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --destroy-target --identity "$I"

# 5. --restore with missing --database
run "restore_requires_database" "--restore without --database refused" 1 "--destroy-target" \
  --restore "$A" --container scratch-c --db-user owner --destroy-target --target-kind isolated --identity "$I"

# 6. Production container under isolated kind -> rejected
run "production_container_rejected_under_isolated" "online-shopping-db must not be isolated" 1 "invalid_target" \
  --restore "$A" --container online-shopping-db --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 7. Production database under isolated kind -> rejected
run "production_db_rejected_under_isolated" "online_shopping must not be isolated" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database online_shopping --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 8. Production container under production kind WITHOUT confirmation -> rejected
run "production_container_needs_confirmation" "online-shopping-db requires confirmation" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --identity "$I"

# 9. Production kind with non-canonical container -> rejected (container ID cannot reach production)
run "production_kind_requires_canonical_container" "arbitrary container id must not be production" 1 "invalid_target" \
  --restore "$A" --container deadbeef1234 --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"

# 10. Production kind with non-canonical database -> rejected
run "production_kind_requires_canonical_db" "arbitrary db must not be production" 1 "invalid_target" \
  --restore "$A" --container online-shopping-db --database other_db --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"

# 11. Wrong confirmation string -> rejected
run "wrong_production_confirmation" "exact confirmation string required" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE something_else" --identity "$I"

# 12. --confirm-production without production kind -> rejected
run "confirm_without_production_kind_rejected" "confirm is only meaningful for production" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --confirm-production "RESTORE online_shopping" --identity "$I"

# 13. Isolated non-production target with all flags -> permitted (safe path)
run "isolated_target_permitted" "non-production restore with --destroy-target allowed" 0 "" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 14. Production target with exact confirmation -> the guard PASSES and only decryption runs
#     next (H7): the decrypt-fails trick proves pg_restore never executes against production.
: > "$FAKEBIN/docker-argv.log"
set +e
FAKE_AGE_DECRYPT_FAIL=1 bash "$RESTORE_SH" --restore "$A" --container online-shopping-db \
  --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" \
  --identity "$I" >"$TMP/.out" 2>&1
rc=$?
set -e
if [[ "$rc" != 1 ]] || ! grep -qF "decrypt_failed" "$TMP/.out"; then
  FAIL=$((FAIL + 1)); echo "FAIL: production_confirmed_reaches_decrypt — expected rc 1 + decrypt_failed"
  sed 's/^/      /' "$TMP/.out" | head -n 10
else
  PASS=$((PASS + 1)); echo "ok:   production_confirmed_reaches_decrypt"
fi
if grep -q 'pg_restore' "$FAKEBIN/docker-argv.log"; then
  FAIL=$((FAIL + 1)); echo "FAIL: pg_restore ran against the production-named target"
else
  PASS=$((PASS + 1)); echo "ok:   production_target_never_reaches_pg_restore"
fi

# 15. --verify with explicit container, no destructive flags -> allowed
run "verify_non_destructive" "--verify needs no --destroy-target" 0 "" \
  --verify "$A" --container online-shopping-db --identity "$I"

# 16. --verify with --destroy-target -> rejected (read-only)
run "verify_rejects_destroy_target" "--verify must not take --destroy-target" 2 "read-only" \
  --verify "$A" --container scratch-c --destroy-target --identity "$I"

# 17. --verify with --database -> rejected
run "verify_rejects_database" "--verify must not take --database" 1 "invalid_target" \
  --verify "$A" --container scratch-c --database scratch-db --identity "$I"

# 18. conninfo/URI database target -> rejected (C2)
run "uri_database_rejected" "postgres:// conninfo must not be a --database" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "postgres://user:pass@host/db" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 19. database value with '=' -> rejected
run "equals_database_rejected" "'=' is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "db=evil" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 20. database value with whitespace -> rejected
run "whitespace_database_rejected" "whitespace is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "two words" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 21. db-user with whitespace -> rejected
run "whitespace_dbuser_rejected" "whitespace user is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user "bad user" \
  --destroy-target --target-kind isolated --identity "$I"

# 22. container name with '/' (conninfo-ish) -> rejected
run "container_with_slash_rejected" "container must not contain '/' " 1 "invalid_target" \
  --restore "$A" --container "scratch/c" --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 23. duplicate --database -> rejected (ambiguous)
run "duplicate_database_rejected" "a value flag may be given at most once" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --database other-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 24. multiple positional archive arguments -> rejected (M6)
run "multiple_archives_rejected" "exactly one archive argument is allowed" 2 "one archive" \
  --restore "$A" "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 25. --verify and --restore together -> rejected (M7)
run "verify_and_restore_rejected" "modes are mutually exclusive" 2 "mutually exclusive" \
  --verify --restore "$A" --container scratch-c --identity "$I"

# 26. Missing identity -> rejected
run "missing_identity_rejected" "age identity is required" 1 "missing_identity" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --destroy-target --target-kind isolated

# 27. Missing archive -> rejected
run "missing_archive_rejected" "archive must exist and be readable" 1 "invalid_archive" \
  --restore "$TMP/nope.dump.age" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 28. pg_restore failure -> restore fails (req 8)
: > "$FAKEBIN/docker-argv.log"
set +e
FAKE_PGRESTORE_FAIL=1 bash "$RESTORE_SH" --restore "$A" --container scratch-c \
  --database scratch-db --db-user owner --destroy-target --target-kind isolated \
  --identity "$I" >"$TMP/.out" 2>&1
rc=$?
set -e
if [[ "$rc" != 1 ]] || ! grep -qF "restore_failed" "$TMP/.out"; then
  FAIL=$((FAIL + 1)); echo "FAIL: pg_restore_failure_returns_failure"
  sed 's/^/      /' "$TMP/.out" | head -n 10
else
  PASS=$((PASS + 1)); echo "ok:   pg_restore_failure_returns_failure"
fi

# 29. readiness (psql) failure after restore -> fails (req 10)
set +e
FAKE_PSQL_FAIL=1 bash "$RESTORE_SH" --restore "$A" --container scratch-c \
  --database scratch-db --db-user owner --destroy-target --target-kind isolated \
  --identity "$I" >"$TMP/.out" 2>&1
rc=$?
set -e
if [[ "$rc" != 1 ]] || ! grep -qF "restore_verify_failed" "$TMP/.out"; then
  FAIL=$((FAIL + 1)); echo "FAIL: readiness_failure_returns_failure"
  sed 's/^/      /' "$TMP/.out" | head -n 10
else
  PASS=$((PASS + 1)); echo "ok:   readiness_failure_returns_failure"
fi

# 30. corrupt archive -> pg_restore --list fails before any restore (M1, req 7)
set +e
FAKE_PGRESTORE_LIST_FAIL=1 bash "$RESTORE_SH" --restore "$A" --container scratch-c \
  --database scratch-db --db-user owner --destroy-target --target-kind isolated \
  --identity "$I" >"$TMP/.out" 2>&1
rc=$?
set -e
if [[ "$rc" != 1 ]] || ! grep -qF "archive_not_restorable" "$TMP/.out"; then
  FAIL=$((FAIL + 1)); echo "FAIL: corrupt_archive_rejected_before_restore"
  sed 's/^/      /' "$TMP/.out" | head -n 10
else
  PASS=$((PASS + 1)); echo "ok:   corrupt_archive_rejected_before_restore"
fi

# 31. M3 argv hygiene + C4 flags on the permitted isolated restore
run "isolated_permitted_sets_flags" "permitted restore reaches pg_restore with atomicity flags" 0 "" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
PGRESTORE_LINE="$(grep ' pg_restore' "$FAKEBIN/docker-argv.log" | tail -n 1)"
if [[ "$PGRESTORE_LINE" == *"--single-transaction"* ]] \
  && [[ "$PGRESTORE_LINE" == *"--clean"* ]] \
  && [[ "$PGRESTORE_LINE" == *"--if-exists"* ]] \
  && [[ "$PGRESTORE_LINE" == *"--exit-on-error"* ]]; then
  PASS=$((PASS + 1)); echo "ok:   atomicity_flags_present"
else
  FAIL=$((FAIL + 1)); echo "FAIL: atomicity_flags_present (line: $PGRESTORE_LINE)"
fi
if [[ "$PGRESTORE_LINE" == *"-e PGPASSWORD="* ]]; then
  PASS=$((PASS + 1)); echo "ok:   pgpassword_passed_via_env_not_argv"
else
  FAIL=$((FAIL + 1)); echo "FAIL: pgpassword_passed_via_env_not_argv (line: $PGRESTORE_LINE)"
fi
if [[ "$PGRESTORE_LINE" != *"://"* ]] && [[ "$PGRESTORE_LINE" == *"-d scratch-db"* ]]; then
  PASS=$((PASS + 1)); echo "ok:   database_passed_as_bare_identifier"
else
  FAIL=$((FAIL + 1)); echo "FAIL: database_passed_as_bare_identifier (line: $PGRESTORE_LINE)"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-RESTORE: FAIL"
  exit 1
fi
echo "TEST-RESTORE: PASS"
exit 0