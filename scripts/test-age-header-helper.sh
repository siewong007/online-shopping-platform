#!/usr/bin/env bash
#
# M3 regression: age_header_has_recipient_stanza (deploy/backup-capacity.sh) MUST fail CLOSED on
# internal tool errors. The OLD check `[[ "$matches" != "0" ]]` accepted an EMPTY match string,
# so if grep or awk failed internally (and the `|| true` swallowed the exit status) the helper
# could PASS a header that was never actually validated.
#
# New rule: only an explicitly NUMERIC POSITIVE stanza count passes.
#   - no stanza           -> fail
#   - malformed/unreadable-> fail
#   - grep/awk tool error -> fail
#   - valid stanza        -> pass
#
# Kept: set -e safety (`|| true`), bounded age-header scan (16-line cap / `--- ` MAC line), no
# full-archive scan.
#
# Requires: bash, coreutils. No docker/age/rclone needed.
#   scripts/test-age-header-helper.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-age-header-helper.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

# shellcheck disable=SC1091
source "$ROOT/deploy/backup-capacity.sh"

VALID="$TMP/valid.age"
printf 'age-encryption.org/v1\n-> X25519 AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n' > "$VALID"
NOSTANZA="$TMP/nostanza.age"
printf 'age-encryption.org/v1\n-> nope-not-a-stanza\n' > "$NOSTANZA"
MISSING="$TMP/does-not-exist.age"

check() { # check <name> <expected_rc> <args...>
  local name="$1" expected="$2" rc=0
  shift 2
  set +e
  ( "$@" ) >/dev/null 2>&1
  rc=$?
  set -e
  if [[ "$rc" == "$expected" ]]; then
    PASS=$((PASS + 1)); echo "ok:   $name"
  else
    FAIL=$((FAIL + 1)); echo "FAIL: $name — expected rc $expected, got $rc"
  fi
}

# Real-tool baselines (the helper runs in-process; PATH is untouched here).
check "valid_stanza_passes" 0 age_header_has_recipient_stanza "$VALID"
check "no_stanza_fails" 1 age_header_has_recipient_stanza "$NOSTANZA"
check "missing_file_fails" 1 age_header_has_recipient_stanza "$MISSING"

# M3: internal tool failures must REJECT, never pass. A failing grep/awk produces an EMPTY match
# string; the old `[[ "$matches" != "0" ]]` would have PASSED it.
FAILBIN="$TMP/failbin"
mkdir -p "$FAILBIN"

cat > "$FAILBIN/grep" <<'GREP'
#!/usr/bin/env bash
echo "grep: internal error (simulated)" >&2
exit 1
GREP
chmod 0700 "$FAILBIN/grep"
PATH="$FAILBIN:$PATH" check "grep_failure_rejected" 1 age_header_has_recipient_stanza "$VALID"
rm -f "$FAILBIN/grep"

cat > "$FAILBIN/awk" <<'AWK'
#!/usr/bin/env bash
echo "awk: internal error (simulated)" >&2
exit 1
AWK
chmod 0700 "$FAILBIN/awk"
PATH="$FAILBIN:$PATH" check "awk_failure_rejected" 1 age_header_has_recipient_stanza "$VALID"
rm -f "$FAILBIN/awk"

# Both failing at once: still rejected.
cat > "$FAILBIN/grep" <<'GREP'
#!/usr/bin/env bash
exit 1
GREP
chmod 0700 "$FAILBIN/grep"
cat > "$FAILBIN/awk" <<'AWK'
#!/usr/bin/env bash
exit 1
AWK
chmod 0700 "$FAILBIN/awk"
PATH="$FAILBIN:$PATH" check "grep_and_awk_failure_rejected" 1 age_header_has_recipient_stanza "$VALID"
rm -f "$FAILBIN/grep" "$FAILBIN/awk"

# The real tools still pass after the stubs are removed (no cross-contamination).
check "valid_stanza_still_passes_after_stubs" 0 age_header_has_recipient_stanza "$VALID"

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-AGE-HEADER-HELPER: FAIL"
  exit 1
fi
echo "TEST-AGE-HEADER-HELPER: PASS"
exit 0