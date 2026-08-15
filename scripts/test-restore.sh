#!/usr/bin/env bash
#
# Destructive-restore guardrail tests for deploy/restore.sh. Runs the real script against stub
# age/docker binaries so the guardrails (--destroy-target, production confirmation) are exercised
# without touching a real database, key or archive.
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
archive=""
for a in "$@"; do
  if [[ "$prev" == "-o" || "$prev" == "--output" ]]; then
    out="$a"
  fi
  prev="$a"
done
last="${@: -1}"
if [[ -f "$last" ]]; then archive="$last"; fi
printf 'age-encryption.org/v1\n' > "$out"
if [[ -n "$archive" ]]; then
  cat "$archive" >> "$out"
else
  cat >> "$out"
fi
exit 0
AGE
chmod 0700 "$FAKEBIN/age"

cat > "$FAKEBIN/docker" <<'DOCKER'
#!/usr/bin/env bash
# Any docker invocation (pg_restore --list / pg_restore / psql) succeeds.
exit 0
DOCKER
chmod 0700 "$FAKEBIN/docker"

export PATH="$FAKEBIN:$PATH"
printf 'fake-custom-archive-bytes\n' > "$TMP/archive.dump.age"
printf 'age1fake-private-identity\n' > "$TMP/identity.txt"

run() {
  # run <name> <desc> <expected_rc> <expected_substring> <args...>
  local name="$1" desc="$2" expected_rc="$3" needle="$4"
  shift 4
  local rc=0
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
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --identity "$I"

# 4. --restore with missing --database
run "restore_requires_database" "--restore without --database refused" 1 "--destroy-target" \
  --restore "$A" --container scratch-c --db-user owner --destroy-target --identity "$I"

# 5. Production container without confirmation -> rejected
run "production_container_needs_confirmation" "online-shopping-db requires confirmation" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database scratch-db --db-user owner \
  --destroy-target --identity "$I"

# 6. Production database without confirmation -> rejected
run "production_db_needs_confirmation" "online_shopping requires confirmation" 1 "production_confirmation_required" \
  --restore "$A" --container scratch-c --database online_shopping --db-user owner \
  --destroy-target --identity "$I"

# 7. Wrong confirmation string -> rejected
run "wrong_production_confirmation" "exact confirmation string required" 1 "production_confirmation_required" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --identity "$I" --confirm-production "RESTORE something_else"

# 8. Non-production target with all flags -> permitted
run "isolated_target_permitted" "non-production restore with --destroy-target allowed" 0 "" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --identity "$I"

# 9. Production target with exact confirmation + all flags -> permitted
run "production_confirmed_permitted" "exact confirmation permits production restore" 0 "" \
  --restore "$A" --container online-shopping-db --database online_shopping --db-user shop_admin \
  --destroy-target --identity "$I" --confirm-production "RESTORE online_shopping"

# 10. --verify with explicit container, no destructive flags -> allowed
run "verify_non_destructive" "--verify needs no --destroy-target" 0 "" \
  --verify "$A" --container online-shopping-db --identity "$I"

# 11. Missing identity -> rejected
run "missing_identity_rejected" "age identity is required" 1 "missing_identity" \
  --restore "$A" --container scratch-c --database scratch-db --db-user owner --destroy-target

# 12. Missing archive -> rejected
run "missing_archive_rejected" "archive must exist and be readable" 1 "invalid_archive" \
  --restore "$TMP/nope.dump.age" --container scratch-c --database scratch-db --db-user owner \
  --destroy-target --identity "$I"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-RESTORE: FAIL"
  exit 1
fi
echo "TEST-RESTORE: PASS"
exit 0