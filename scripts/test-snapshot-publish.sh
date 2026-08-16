#!/usr/bin/env bash
#
# M2 regression: snapshot publication MUST be atomic no-clobber with a RELIABLE success signal.
# deploy/restore.sh publishes the pre-restore safety snapshot via the shared
# deploy/backup-capacity.sh:publish_no_clobber — a HARD LINK (`ln`): atomic, and its exit status
# is definitive (destination absent -> success; destination exists -> EEXIST, never an
# overwrite). The old `mv -n` is unreliable because GNU mv may return 0 when the destination
# exists and the source is left untouched (RENAME_NOREPLACE is only attempted on Linux and
# silently degrades elsewhere), so its exit status cannot be trusted to mean a move happened.
#
# Proves (deterministic, no timing):
#   A. destination pre-exists            -> a DIFFERENT suffixed destination is created
#   B. destination + suffix-1 pre-exist  -> retry continues past every occupied name (each ln
#      attempt is atomic, so a racing writer appearing between attempts is handled identically)
#   C. successful publication            -> destination holds EXACTLY the expected bytes, and the
#      temp source no longer exists
#   D. 100 collisions                    -> fail closed, source removed, NO publication
#   E. missing source                    -> fail closed (rc 1)
#   F. ln fails + destination ABSENT (EACCES-class) -> NON-COLLISION publication failure: fail
#      closed IMMEDIATELY with exactly ONE ln invocation (never 100 fake collision retries)
#   G. ln fails + destination ABSENT (simulated EXDEV) -> same immediate fail-closed
#      classification; a cross-device link error is not a collision
#
# Requires: bash, coreutils. No docker/age/rclone needed.
#   scripts/test-snapshot-publish.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-snapshot-publish.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

# shellcheck disable=SC1091
source "$ROOT/deploy/backup-capacity.sh"

DIR="$TMP/snapshots"
STEM="pre-restore-20260101T000000Z"
mkdir -p "$DIR"

check_publish() { # check_publish <name> <src> <expected_rc> <expected_path> <expected_bytes>
  local name="$1" src="$2" expected_rc="$3" expected_path="$4" expected_bytes="$5"
  local out rc=0
  set +e
  out=$(publish_no_clobber "$src" "$DIR" "$STEM" 2>&1)
  rc=$?
  set -e
  if [[ "$rc" == "$expected_rc" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name (rc $rc)"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected rc $expected_rc, got $rc"
    printf '%s\n' "$out" | sed 's/^/      /'
  fi
  if [[ -n "$expected_path" ]]; then
    if [[ "$out" == "$expected_path" ]]; then
      PASS=$((PASS + 1)); echo "ok:   ${name}_path ($out)"
    else
      FAIL=$((FAIL + 1)); echo "FAIL: ${name}_path — expected '$expected_path', got '$out'"
    fi
    if [[ -f "$expected_path" && "$(cat "$expected_path")" == "$expected_bytes" ]]; then
      PASS=$((PASS + 1)); echo "ok:   ${name}_exact_bytes"
    else
      FAIL=$((FAIL + 1)); echo "FAIL: ${name}_exact_bytes — destination does not hold the exact expected bytes"
    fi
  fi
  if [[ -e "$src" ]]; then
    FAIL=$((FAIL + 1)); echo "FAIL: ${name}_temp_consumed — temp source still exists: $src"
  else
    PASS=$((PASS + 1)); echo "ok:   ${name}_temp_consumed"
  fi
}

fresh() { rm -rf "$DIR"; mkdir -p "$DIR"; }

# A. destination pre-exists -> suffixed destination created with the exact bytes, temp consumed.
fresh
SRC_A="$DIR/.pre-restore.abc123"
printf 'SNAPSHOT-EXPECTED-CONTENT-AAA\n' > "$SRC_A"
printf 'PREEXISTING-OTHER-RUN\n' > "$DIR/$STEM.dump.age"
check_publish "preexisting_dest_gets_suffix" "$SRC_A" 0 "$DIR/$STEM-1.dump.age" "SNAPSHOT-EXPECTED-CONTENT-AAA"
if [[ "$(cat "$DIR/$STEM.dump.age")" == "PREEXISTING-OTHER-RUN" ]]; then
  PASS=$((PASS + 1)); echo "ok:   preexisting_dest_never_overwritten"
else
  FAIL=$((FAIL + 1)); echo "FAIL: preexisting_dest_never_overwritten — a pre-existing snapshot was clobbered"
fi

# B. destination AND suffix-1 pre-exist (a writer racing between retry attempts is equivalent to
# an occupied name — each ln attempt is atomic) -> retry lands on suffix-2.
fresh
SRC_B="$DIR/.pre-restore.def456"
printf 'SNAPSHOT-EXPECTED-CONTENT-BBB\n' > "$SRC_B"
printf 'OTHER-RUN-1\n' > "$DIR/$STEM.dump.age"
printf 'OTHER-RUN-2\n' > "$DIR/$STEM-1.dump.age"
check_publish "retry_past_occupied_names" "$SRC_B" 0 "$DIR/$STEM-2.dump.age" "SNAPSHOT-EXPECTED-CONTENT-BBB"

# C. no pre-existing name -> base destination, exact bytes, temp gone.
fresh
SRC_C="$DIR/.pre-restore.ghi789"
printf 'SNAPSHOT-EXPECTED-CONTENT-CCC\n' > "$SRC_C"
check_publish "clean_publish_base_name" "$SRC_C" 0 "$DIR/$STEM.dump.age" "SNAPSHOT-EXPECTED-CONTENT-CCC"

# D. 100 occupied names -> fail closed (rc 1), source removed, no new file beyond the 100.
fresh
SRC_D="$DIR/.pre-restore.jkl012"
printf 'SNAPSHOT-EXPECTED-CONTENT-DDD\n' > "$SRC_D"
printf 'OCCUPIED\n' > "$DIR/$STEM.dump.age"
for i in $(seq 1 99); do
  printf 'OCCUPIED\n' > "$DIR/$STEM-${i}.dump.age"
done
check_publish "hundred_collisions_fail_closed" "$SRC_D" 1 "" ""
if (( $(find "$DIR" -name "$STEM*.dump.age" | wc -l) == 100 )); then
  PASS=$((PASS + 1)); echo "ok:   hundred_collisions_no_extra_file"
else
  FAIL=$((FAIL + 1)); echo "FAIL: hundred_collisions_no_extra_file — a 101st snapshot appeared"
fi

# E. missing source -> fail closed (rc 1).
fresh
check_publish "missing_source_fails_closed" "$DIR/.pre-restore.nope" 1 "" ""

# F. ln fails while the destination name is ABSENT (an EACCES-class error on the snapshot
# directory). This is a NON-COLLISION publication failure: retrying a different name can never
# succeed, so the helper must fail closed IMMEDIATELY — exactly ONE ln invocation, never 100
# fake collision retries — with no destination created and the temp source cleaned up.
# The ln stub logs every invocation; its exit status is the whole contract under test.
fresh
SRC_F="$DIR/.pre-restore.mno345"
printf 'SNAPSHOT-EXPECTED-CONTENT-FFF\n' > "$SRC_F"
FAKEBIN_F="$TMP/failbin-eperm"
mkdir -p "$FAKEBIN_F"
LNCALLS_F="$TMP/ln-calls-eperm.log"
cat > "$FAKEBIN_F/ln" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$LNCALLS_F"
echo "ln: failed to create hard link: Permission denied" >&2
exit 1
STUB
chmod 0700 "$FAKEBIN_F/ln"
OLD_PATH="$PATH"
PATH="$FAKEBIN_F:$PATH"
check_publish "noncollision_eperm_fails_immediately" "$SRC_F" 1 "" ""
PATH="$OLD_PATH"
if [[ "$(wc -l < "$LNCALLS_F")" == 1 ]]; then
  PASS=$((PASS + 1)); echo "ok:   noncollision_eperm_single_ln_invocation (no fake collision retries)"
else
  FAIL=$((FAIL + 1)); echo "FAIL: noncollision_eperm_single_ln_invocation — expected exactly 1 ln call, got $(wc -l < "$LNCALLS_F")"
fi
if [[ ! -e "$DIR/$STEM.dump.age" && -z "$(find "$DIR" -name "$STEM*.dump.age" 2>/dev/null)" ]]; then
  PASS=$((PASS + 1)); echo "ok:   noncollision_eperm_no_publication"
else
  FAIL=$((FAIL + 1)); echo "FAIL: noncollision_eperm_no_publication — a snapshot file appeared despite publication failure"
fi

# G. simulated EXDEV: the destination name is absent and ln reports a cross-device link error.
# Same classification as F — an EXDEV is a non-collision publication failure and must fail
# closed after exactly ONE attempt, not burn the collision budget.
fresh
SRC_G="$DIR/.pre-restore.pqr678"
printf 'SNAPSHOT-EXPECTED-CONTENT-GGG\n' > "$SRC_G"
FAKEBIN_G="$TMP/failbin-exdev"
mkdir -p "$FAKEBIN_G"
LNCALLS_G="$TMP/ln-calls-exdev.log"
cat > "$FAKEBIN_G/ln" <<STUB
#!/usr/bin/env bash
printf '%s\n' "\$*" >> "$LNCALLS_G"
echo "ln: failed to create hard link: Invalid cross-device link" >&2
exit 1
STUB
chmod 0700 "$FAKEBIN_G/ln"
OLD_PATH="$PATH"
PATH="$FAKEBIN_G:$PATH"
check_publish "exdev_fails_immediately_not_collision" "$SRC_G" 1 "" ""
PATH="$OLD_PATH"
if [[ "$(wc -l < "$LNCALLS_G")" == 1 ]]; then
  PASS=$((PASS + 1)); echo "ok:   exdev_single_ln_invocation (no fake collision retries)"
else
  FAIL=$((FAIL + 1)); echo "FAIL: exdev_single_ln_invocation — expected exactly 1 ln call, got $(wc -l < "$LNCALLS_G")"
fi
if [[ -z "$(find "$DIR" -name "$STEM*.dump.age" 2>/dev/null)" ]]; then
  PASS=$((PASS + 1)); echo "ok:   exdev_no_publication"
else
  FAIL=$((FAIL + 1)); echo "FAIL: exdev_no_publication — a snapshot file appeared despite publication failure"
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-SNAPSHOT-PUBLISH: FAIL"
  exit 1
fi
echo "TEST-SNAPSHOT-PUBLISH: PASS"
exit 0