#!/usr/bin/env bash
#
# Destructive-restore guardrail tests for deploy/restore.sh. Runs the real script against stub
# age/docker binaries so the guardrails (--destroy-target, --target-kind, production confirmation,
# strict identifier validation, atomicity flags, container identity resolution, safety snapshot)
# are exercised without touching a real database, key or archive.
#
# H7: the test is STRUCTURALLY incapable of reaching a real database: docker and age resolve only
# inside FAKEBIN (asserted below).
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

PROD_CANONICAL_ID="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
ISOLATED_CANONICAL_ID="1122334455667788990011223344556677889900112233445566778899001122"

cat > "$FAKEBIN/docker" <<DOCKER
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "\${FAKEBIN_DIR:-/nonexistent}/docker-argv.log"
case "\${1:-}" in
  inspect)
    if [[ "\${FAKE_DOCKER_INSPECT_FAIL:-0}" == "1" ]]; then
      echo "Error: No such container" >&2
      exit 1
    fi
    target="\${@: -1}"
    if [[ "\${FAKE_PROD_INSPECT_FAIL:-0}" == "1" && "\$target" == "online-shopping-db" ]]; then
      echo "Error: No such container" >&2
      exit 1
    fi
    if [[ "\${FAKE_TARGET_INSPECT_FAIL:-0}" == "1" && "\$target" != "online-shopping-db" ]]; then
      echo "Error: No such container" >&2
      exit 1
    fi
    case "\$target" in
      online-shopping-db|prod-alias|abcdef123456|"$PROD_CANONICAL_ID")
        printf '%s\n' "$PROD_CANONICAL_ID"
        exit 0 ;;
      scratch-c|"$ISOLATED_CANONICAL_ID"|*)
        printf '%s\n' "$ISOLATED_CANONICAL_ID"
        exit 0 ;;
    esac
    ;;
  exec)
    if [[ "\${FAKE_PGDUMP_SNAP_FAIL:-0}" == "1" && "\$*" == *"pg_dump"* ]]; then
      echo "pg_dump snapshot error" >&2
      exit 4
    fi
    if [[ "\${FAKE_PGRESTORE_LIST_FAIL:-0}" == "1" && "\$*" == *"--list"* ]]; then
      echo "pg_restore --list failed" >&2
      exit 3
    fi
    if [[ "\${FAKE_PGRESTORE_FAIL:-0}" == "1" && "\$*" != *"--list"* ]]; then
      echo "pg_restore failed" >&2
      exit 3
    fi
    if [[ "\${FAKE_PSQL_FAIL:-0}" == "1" ]]; then
      echo "psql failed" >&2
      exit 3
    fi
    # Mock successful pg_dump / psql output
    if [[ "\$*" == *"SELECT count(*) FROM app_schema_migrations"* ]]; then
      printf '15\n'
      exit 0
    fi
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

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
if [[ "${FAKE_AGE_DECRYPT_FAIL:-0}" == "1" && "$*" != *"--encrypt"* ]]; then
  echo "age: decryption failed (trap)" >&2
  exit 5
fi
if [[ "${FAKE_AGE_ENCRYPT_FAIL:-0}" == "1" && "$*" == *"--encrypt"* ]]; then
  echo "age: snapshot encryption failed" >&2
  exit 6
fi
if [[ "${FAKE_AGE_NO_STANZA:-0}" == "1" && "$*" == *"--encrypt"* ]]; then
  # D2/D6: an age header WITHOUT a well-formed X25519 recipient stanza (e.g. passphrase mode).
  printf 'age-encryption.org/v1\n-> nope-not-a-stanza\n' > "$out"
  exit 0
fi
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$out"
cat >> "$out"
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

cat > "$FAKEBIN/age-keygen" <<'KEYGEN'
#!/usr/bin/env bash
if [[ "${1:-}" == "-y" ]]; then
  printf 'age1fake-derived-public-recipient\n'
  exit 0
fi
printf 'AGE-SECRET-KEY-1FAKE\n'
exit 0
KEYGEN
chmod 0700 "$FAKEBIN/age-keygen"

cat > "$FAKEBIN/df" <<'DF'
#!/usr/bin/env bash
if [[ -n "${FAKE_DF_SNAP_AVAIL:-}" ]] && [[ "$*" == *"$RESTORE_SNAPSHOT_DIR"* ]]; then
  printf 'Avail\n%s\n' "$FAKE_DF_SNAP_AVAIL"
  exit 0
fi
if [[ -n "${FAKE_DF_AVAIL:-}" ]]; then
  printf 'Avail\n%s\n' "$FAKE_DF_AVAIL"
  exit 0
fi
exec /usr/bin/df "$@"
DF
chmod 0700 "$FAKEBIN/df"

export PATH="$FAKEBIN:$PATH"
export FAKEBIN_DIR="$FAKEBIN"
export RESTORE_WORKDIR="$TMP/work"
export RESTORE_SNAPSHOT_DIR="$TMP/snapshots"
mkdir -p "$RESTORE_WORKDIR" "$RESTORE_SNAPSHOT_DIR"

printf 'age-encryption.org/v1\nfake-custom-archive-bytes\n' > "$TMP/archive.dump.age"
printf 'AGE-SECRET-KEY-1FAKE\n' > "$TMP/identity.txt"

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

# 6. Production container name under isolated kind -> rejected
run "production_container_name_rejected_under_isolated" "online-shopping-db must not be isolated" 1 "invalid_target" \
  --restore "$A" --container online-shopping-db --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 7. Production database under isolated kind -> rejected
run "production_db_rejected_under_isolated" "online_shopping must not be isolated" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database online_shopping --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 8. Short container ID resolving to production under isolated kind -> rejected (Docker inspect resolution)
run "production_short_id_rejected_under_isolated" "short ID resolving to prod must be rejected" 1 "resolves to the production container" \
  --restore "$A" --container abcdef123456 --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 9. Full 64-char container ID resolving to production under isolated kind -> rejected
run "production_full_id_rejected_under_isolated" "full ID resolving to prod must be rejected" 1 "resolves to the production container" \
  --restore "$A" --container "$PROD_CANONICAL_ID" --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 10. Container alias resolving to production under isolated kind -> rejected
run "production_alias_rejected_under_isolated" "alias resolving to prod must be rejected" 1 "resolves to the production container" \
  --restore "$A" --container prod-alias --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 11. Production container under production kind WITHOUT confirmation -> rejected
run "production_container_needs_confirmation" "online-shopping-db requires confirmation" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --identity "$I"

# 12. Production kind with non-canonical container name -> rejected
run "production_kind_requires_canonical_container" "arbitrary container name must not be production" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"

# 13. Production kind with non-canonical database -> rejected
run "production_kind_requires_canonical_db" "arbitrary db must not be production" 1 "invalid_target" \
  --restore "$A" --container online-shopping-db --database other_db --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"

# 14. Wrong confirmation string -> rejected
run "wrong_production_confirmation" "exact confirmation string required" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE something_else" --identity "$I"

# 15. --confirm-production without production kind -> rejected
run "confirm_without_production_kind_rejected" "confirm is only meaningful for production" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --confirm-production "RESTORE online_shopping" --identity "$I"

# 16. Isolated non-production target with all flags -> permitted (safe path)
run "isolated_target_permitted" "non-production restore with --destroy-target allowed" 0 "" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 17. Production target: safety snapshot failure aborts restore before decrypting archive
export FAKE_PGDUMP_SNAP_FAIL=1
run "production_snapshot_failure_aborts" "snapshot failure must fail closed before decrypting archive" 1 "safety_snapshot_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
unset FAKE_PGDUMP_SNAP_FAIL

# 18. Production target: safety snapshot creation succeeds, proceeds to decrypt
export FAKE_AGE_DECRYPT_FAIL=1
run "production_confirmed_creates_snapshot_and_decrypts" "valid production parameters create snapshot and proceed" 1 "decrypt_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
unset FAKE_AGE_DECRYPT_FAIL
if grep -q 'pre-restore-' <<<"$(find "$RESTORE_SNAPSHOT_DIR" -name 'pre-restore-*.dump.age' 2>/dev/null)"; then
  PASS=$((PASS + 1)); echo "ok:   safety_snapshot_file_written"
else
  echo "FAIL: safety snapshot file not written to $RESTORE_SNAPSHOT_DIR"; FAIL=$((FAIL+1))
fi

# 19. --verify with explicit container, no destructive flags -> allowed
run "verify_non_destructive" "--verify needs no --destroy-target" 0 "" \
  --verify "$A" --container scratch-c --identity "$I"

# 20. --verify with --destroy-target -> rejected (read-only)
run "verify_rejects_destroy_target" "--verify must not take --destroy-target" 2 "read-only" \
  --verify "$A" --container scratch-c --destroy-target --identity "$I"

# 21. --verify with --database -> rejected
run "verify_rejects_database" "--verify must not take --database" 1 "invalid_target" \
  --verify "$A" --container scratch-c --database scratch-db --identity "$I"

# 22. conninfo/URI database target -> rejected (C2)
run "uri_database_rejected" "postgres:// conninfo must not be a --database" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "postgres://user:pass@host/db" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 23. database value with '=' -> rejected
run "equals_database_rejected" "'=' is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "db=evil" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 24. database value with whitespace -> rejected
run "whitespace_database_rejected" "whitespace is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database "two words" --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 25. db-user with whitespace -> rejected
run "whitespace_dbuser_rejected" "whitespace user is not a bare identifier" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user "bad user" \
  --destroy-target --target-kind isolated --identity "$I"

# 26. container name with '/' -> rejected
run "container_with_slash_rejected" "container must not contain '/' " 1 "invalid_target" \
  --restore "$A" --container "scratch/c" --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 27. duplicate --target-kind -> rejected
run "duplicate_target_kind_rejected" "duplicate --target-kind is rejected" 1 "invalid_target" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --target-kind isolated --identity "$I"

# 28. multiple positional archive arguments -> rejected
run "multiple_archives_rejected" "exactly one archive argument is allowed" 2 "one archive" \
  --restore "$A" "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 29. --verify and --restore together -> rejected
run "verify_and_restore_rejected" "modes are mutually exclusive" 2 "mutually exclusive" \
  --verify --restore "$A" --container scratch-c --identity "$I"

# 30. Missing identity -> rejected
run "missing_identity_rejected" "age identity is required" 1 "missing_identity" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --destroy-target --target-kind isolated

# 31. Missing archive -> rejected
run "missing_archive_rejected" "archive must exist and be readable" 1 "invalid_archive" \
  --restore "$TMP/nope.dump.age" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"

# 32. Staging capacity check before decryption fails when disk space is insufficient
export FAKE_DF_AVAIL=1000
run "pre_decrypt_capacity_check_fails" "fails before decrypting when disk space too low" 1 "insufficient_staging_space" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
unset FAKE_DF_AVAIL

# 33. pg_restore failure -> restore fails
export FAKE_PGRESTORE_FAIL=1
run "pg_restore_failure_returns_failure" "pg_restore error returns restore_failed" 1 "restore_failed" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
unset FAKE_PGRESTORE_FAIL

# 34. corrupt archive -> pg_restore --list fails before any restore
export FAKE_PGRESTORE_LIST_FAIL=1
run "corrupt_archive_rejected_before_restore" "corrupt archive fails TOC listing" 1 "archive_not_restorable" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
unset FAKE_PGRESTORE_LIST_FAIL

# N1 regression A: PRODUCTION-kind restore, production identity UNRESOLVABLE -> fail closed
# (target_resolution_failed) before any snapshot/decrypt.
export FAKE_PROD_INSPECT_FAIL=1
run "prod_unresolvable_production_kind_fails_closed" "production kind must fail closed when production identity is unresolvable" 1 "target_resolution_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
if grep -q ' pg_dump' "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: prod_unresolvable_production_kind_fails_closed — snapshot attempted despite unresolvable production identity"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   prod_unresolvable_production_kind_no_snapshot"
fi
unset FAKE_PROD_INSPECT_FAIL

# N1 regression B (the original P0-BKP-01 flaw): ISOLATED-kind restore, production identity
# UNRESOLVABLE -> the run must FAIL CLOSED (old code silently continued and permitted the
# restore). Zero pg_dump/pg_restore may be attempted.
export FAKE_PROD_INSPECT_FAIL=1
run "prod_unresolvable_isolated_kind_fails_closed" "isolated kind must fail closed when production identity is unresolvable" 1 "target_resolution_failed" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
if grep -qE ' pg_dump| pg_restore' "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: prod_unresolvable_isolated_kind_fails_closed — dump/restore attempted despite unresolvable production identity"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   prod_unresolvable_isolated_kind_no_dump_or_restore"
fi
unset FAKE_PROD_INSPECT_FAIL

# N1 regression C: PRODUCTION-kind restore with the docker resolution itself UNREACHABLE
# (both target and production inspect fail) -> fail closed with target_resolution_failed before
# any snapshot/decrypt.
export FAKE_DOCKER_INSPECT_FAIL=1
run "target_unresolvable_production_kind_fails_closed" "production kind must fail closed when the target identity is unresolvable" 1 "target_resolution_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
if grep -q ' pg_dump' "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: target_unresolvable_production_kind_fails_closed — snapshot attempted despite unresolvable target"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   target_unresolvable_production_kind_no_snapshot"
fi
unset FAKE_DOCKER_INSPECT_FAIL

# N1 regression D: ISOLATED-kind restore, TARGET identity unresolvable -> fail closed.
export FAKE_TARGET_INSPECT_FAIL=1
run "target_unresolvable_isolated_kind_fails_closed" "isolated kind must fail closed when the target identity is unresolvable" 1 "target_resolution_failed" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
unset FAKE_TARGET_INSPECT_FAIL

# N2: the pre-restore safety snapshot capacity check (shared rule, deploy/backup-capacity.sh)
# runs before pg_dump and before any decrypt: with FAKE_DF_SNAP_AVAIL=1000 only the snapshot
# directory is reported tiny (staging stays healthy), so the production restore must fail with
# safety_snapshot_failed and attempt ZERO pg_dump and ZERO pg_restore.
export FAKE_DF_SNAP_AVAIL=1000
run "snapshot_capacity_check_fails_closed" "production snapshot capacity check must fail before pg_dump" 1 "safety_snapshot_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
if grep -qE ' pg_dump| pg_restore' "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: snapshot_capacity_check_fails_closed — dump/restore attempted despite insufficient snapshot space"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   snapshot_capacity_no_dump_or_restore"
fi
unset FAKE_DF_SNAP_AVAIL

# D2/D6: a production snapshot whose age header has NO valid X25519 recipient stanza fails
# CLOSED with safety_snapshot_failed and leaves NO snapshot artifact and NO .pre-restore temp
# file. (Regression: the old standalone `stanza_count=$(... | grep -c ...)` assignment aborted
# the script BEFORE the cleanup and fail() ran when grep -c exited 1 on zero matches.)
rm -rf "$RESTORE_SNAPSHOT_DIR" && mkdir -p "$RESTORE_SNAPSHOT_DIR"
export FAKE_AGE_NO_STANZA=1
run "snapshot_no_stanza_fails_closed" "production snapshot with no X25519 stanza must fail closed" 1 "safety_snapshot_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
unset FAKE_AGE_NO_STANZA
if find "$RESTORE_SNAPSHOT_DIR" -name 'pre-restore-*.dump.age' 2>/dev/null | grep -q .; then
  echo "FAIL: snapshot_no_stanza_fails_closed — snapshot artifact left behind"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   snapshot_no_stanza_no_artifact"
fi
if find "$RESTORE_SNAPSHOT_DIR" -name '.pre-restore.*' 2>/dev/null | grep -q .; then
  echo "FAIL: snapshot_no_stanza_fails_closed — .pre-restore temp file left behind"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   snapshot_no_stanza_no_temp_leftover"
fi

# N2: collision-safe snapshot names — two production runs in the same second must produce two
# DISTINCT snapshot files, never overwrite. Each run stops right after the snapshot (decrypt
# fails), then the snapshot directory must contain exactly the files of the runs.
export FAKE_AGE_DECRYPT_FAIL=1
run "snapshot_collision_run_1" "first production snapshot run" 1 "decrypt_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
run "snapshot_collision_run_2" "second production snapshot run (same second)" 1 "decrypt_failed" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --target-kind production --confirm-production "RESTORE online_shopping" --identity "$I"
unset FAKE_AGE_DECRYPT_FAIL
SNAP_COUNT=$(find "$RESTORE_SNAPSHOT_DIR" -name 'pre-restore-*.dump.age' 2>/dev/null | wc -l)
if (( SNAP_COUNT >= 2 )); then
  PASS=$((PASS + 1)); echo "ok:   snapshot_collision_names_unique ($SNAP_COUNT snapshot files)"
else
  echo "FAIL: snapshot_collision_names_unique — expected >= 2 snapshot files, found $SNAP_COUNT"; FAIL=$((FAIL+1))
fi
# The archive itself must not have been destroyed by the snapshot runs (still readable).
if [[ -s "$A" ]]; then
  PASS=$((PASS + 1)); echo "ok:   snapshot_runs_keep_archive_intact"
else
  echo "FAIL: snapshot_runs_keep_archive_intact — archive missing/empty after snapshot runs"; FAIL=$((FAIL+1))
fi

# 35. M3 argv hygiene: password inherited by name, secret value NEVER in argv
export PGPASSWORD="my_secret_restore_password_9988"
run "password_via_env_inheritance_not_argv" "password passed via env inheritance" 0 "" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --target-kind isolated --identity "$I"
PGRESTORE_LINE="$(grep ' pg_restore' "$FAKEBIN/docker-argv.log" | tail -n 1)"
if [[ "$PGRESTORE_LINE" == *"-e PGPASSWORD "* || "$PGRESTORE_LINE" == *"-e PGPASSWORD" ]]; then
  PASS=$((PASS + 1)); echo "ok:   restore_pgpassword_inherited_by_name"
else
  FAIL=$((FAIL + 1)); echo "FAIL: restore -e PGPASSWORD not in docker argv (line: $PGRESTORE_LINE)"
fi
if grep -q "my_secret_restore_password_9988" "$FAKEBIN/docker-argv.log"; then
  echo "FAIL: restore password value leaked into docker argv!"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   restore_password_value_never_in_argv"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-RESTORE: FAIL"
  exit 1
fi
echo "TEST-RESTORE: PASS"
exit 0