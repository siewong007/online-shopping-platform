#!/usr/bin/env bash
#
# M1 regression: the restore-proof/atomicity harness cleanup MUST fail closed. A throwaway
# target container may be removed ONLY when BOTH the target identity AND the production identity
# resolve and are proven DIFFERENT (shared deploy/backup-capacity.sh:safe_rm_target). If either
# identity is unresolvable or the two are equal, cleanup must delete NOTHING — an unresolvable
# production identity is never an excuse to `docker rm` a possibly-production target.
#
# The OLD cleanup deleted whenever `target_id` was empty OR `prod_id` was empty OR they differed,
# so an unresolvable production identity turned the EXIT trap into a destructive delete.
#
# Proves (against a docker stub that counts every `rm`):
#   1. prod resolves + target different            -> cleanup MAY remove the isolated target
#   2. prod resolves + target same (id equal)      -> cleanup MUST NOT remove
#   3. production identity UNRESOLVABLE            -> guard refuses, EXIT trap runs, rm count ZERO
#   4. target identity UNRESOLVABLE                -> rm count ZERO
#   5. RP_PROD_CONTAINER / TARGET_CONTAINER overrides cannot turn a renamed production container
#      into a cleanup target (name != prod but id == prod -> refusal, zero rm)
#
# Part A unit-drives safe_rm_target directly; Part B runs the REAL scripts/restore-proof.sh so
# the EXIT trap wiring is exercised end to end.
#
# Requires: bash, coreutils. No real docker/age/rclone needed.
#   scripts/test-restore-proof-cleanup.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESTORE_PROOF_SH="$ROOT/scripts/restore-proof.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-restore-proof-cleanup.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

FAKEBIN="$TMP/bin"
mkdir -p "$FAKEBIN"

PROD_ID="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
OTHER_ID="1122334455667788990011223344556677889900112233445566778899001122"

cat > "$FAKEBIN/docker" <<DOCKER
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "\${FAKEBIN_DIR:-/nonexistent}/docker-argv.log"
case "\${1:-}" in
  inspect)
    target="\${@: -1}"
    case "\$target" in
      "\${RP_PROD:-online-shopping-db}"|"\${RP_PROD_ALIAS:-none}")
        printf '%s\n' "$PROD_ID"
        exit 0 ;;
      "\${TARGET_DISTINCT:-none}")
        printf '%s\n' "$OTHER_ID"
        exit 0 ;;
      *)
        echo "Error: No such container: \$target" >&2
        exit 1 ;;
    esac
    ;;
  exec) exit 1 ;;
  rm)
    printf '%s\n' "\$*" >> "\${FAKEBIN_DIR:-/nonexistent}/docker-rm.log"
    exit 0 ;;
  *) exit 0 ;;
esac
DOCKER
chmod 0700 "$FAKEBIN/docker"

# Stubs so the REAL restore-proof.sh passes its `req docker age age-keygen rclone` check in the
# RP_ONLY_PARITY path (its parity queries then fail via the failing docker exec stub).
for tool in age age-keygen rclone; do
  cat > "$FAKEBIN/$tool" <<STUB
#!/usr/bin/env bash
exit 0
STUB
  chmod 0700 "$FAKEBIN/$tool"
done

export PATH="$FAKEBIN:$PATH"
export FAKEBIN_DIR="$FAKEBIN"

# shellcheck disable=SC1091
source "$ROOT/deploy/backup-capacity.sh"

rm_count() {
  [[ -f "$FAKEBIN/docker-rm.log" ]] && wc -l < "$FAKEBIN/docker-rm.log" || echo 0
}
reset_rm_log() { : > "$FAKEBIN/docker-rm.log"; }

# ---------- Part A: unit-drive safe_rm_target (the cleanup implementation) ----------
unit_rm() { # unit_rm <name> <target> <expected_rm_count> <expect_skip_message>
  local name="$1" target="$2" expected="$3" expect_skip="$4" out rc=0
  reset_rm_log
  set +e
  out=$(safe_rm_target "$target" 2>&1)
  rc=$?
  set -e
  local n
  n=$(rm_count)
  if [[ "$n" == "$expected" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name (rm count $n)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected $expected rm(s), got $n"; printf '%s\n' "$out" | sed 's/^/      /'
  fi
  if [[ "$expect_skip" == "1" ]] && ! grep -q 'skipping target removal' <<<"$out"; then
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected a 'skipping target removal' refusal, got:"; printf '%s\n' "$out" | sed 's/^/      /'
  fi
  if [[ "$expect_skip" == "0" ]] && grep -q 'skipping target removal' <<<"$out"; then
    FAIL=$((FAIL + 1)); echo "FAIL: $name — cleanup refused although the target is proven distinct"
  fi
}

export RP_PROD_CONTAINER="online-shopping-db"
export TARGET_DISTINCT="restore-proof-unit-target"

# 1. prod resolves + target different -> MAY remove
unit_rm "cleanup_removes_distinct_target" "restore-proof-unit-target" 1 0
# 2. prod resolves + target SAME identity (renamed production) -> MUST NOT remove
unit_rm "cleanup_refuses_renamed_production" "prod-alias" 0 1
# 3. production identity unresolvable -> MUST NOT remove
export RP_PROD_CONTAINER="online-shopping-db-does-not-exist"
unit_rm "cleanup_refuses_when_prod_unresolvable" "restore-proof-unit-target" 0 1
# 4. target identity unresolvable -> MUST NOT remove
export RP_PROD_CONTAINER="online-shopping-db"
unit_rm "cleanup_refuses_when_target_unresolvable" "no-such-target" 0 1
# 5. canonical production NAME under any override -> MUST NOT remove
export RP_PROD_CONTAINER="online-shopping-db"
unit_rm "cleanup_refuses_canonical_prod_name" "online-shopping-db" 0 1

# ---------- Part B: REAL scripts/restore-proof.sh — guard refusal + EXIT trap, zero rm ----------
script_assert() { # script_assert <name> <needle> <env_args...> (env_args as VAR=value pairs)
  local name="$1" needle="$2"
  shift 2
  local out rc=0
  reset_rm_log
  set +e
  out=$(env "$@" bash "$RESTORE_PROOF_SH" 2>&1)
  rc=$?
  set -e
  local n
  n=$(rm_count)
  if (( rc != 0 )); then
    PASS=$((PASS + 1)); echo "ok:   $name (rc $rc)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected refusal (nonzero rc), got 0"
  fi
  if ! grep -qF "$needle" <<<"$out"; then
    FAIL=$((FAIL + 1)); echo "FAIL: $name — output missing '$needle'"; printf '%s\n' "$out" | sed 's/^/      /' | head -n 10
  fi
  if [[ "$n" == "0" ]]; then
    PASS=$((PASS + 1)); echo "ok:   ${name}_zero_rm (EXIT trap ran, docker rm count 0)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: ${name}_zero_rm — cleanup deleted with unresolvable/equal identity (rm count $n)"
  fi
}

# 3 (script level): production identity unresolvable -> guard refuses -> EXIT trap -> ZERO rm.
script_assert "rp_prod_unresolvable_trap_zero_rm" "cannot resolve the production container" \
  RP_PROD_CONTAINER="online-shopping-db-does-not-exist" \
  TARGET_CONTAINER="restore-proof-trap-target"

# 5 (script level): TARGET_CONTAINER override naming a RENAMED production container (name differs,
# id equals prod) -> guard refuses -> EXIT trap -> ZERO rm (never a cleanup target).
script_assert "rp_renamed_prod_trap_zero_rm" "resolves to the production container ID" \
  RP_PROD_CONTAINER="online-shopping-db" \
  RP_PROD_ALIAS="prod-alias" \
  TARGET_CONTAINER="prod-alias"

# 4 (script level): target identity unresolvable -> parity fails -> EXIT trap -> ZERO rm (the
# skip refusal is logged by safe_rm_target). RP_ONLY_PARITY keeps the run inside parity_validation.
script_assert "rp_target_unresolvable_trap_zero_rm" "skipping target removal" \
  RP_ONLY_PARITY=1 \
  RP_PROD_CONTAINER="online-shopping-db" \
  TARGET_CONTAINER="no-such-target"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-RESTORE-PROOF-CLEANUP: FAIL"
  exit 1
fi
echo "TEST-RESTORE-PROOF-CLEANUP: PASS"
exit 0