#!/usr/bin/env bash
#
# Adversarial unit tests for deploy/backup-env-parser.sh.
#
# Tests the strict parser under malicious, malformed and boundary inputs to prove:
#   - shell code ($(...), backticks) is NEVER evaluated,
#   - matching quotes are stripped, unmatched quotes kept literal,
#   - process variables (PATH, LD_PRELOAD, IFS, etc.) CANNOT be injected,
#   - duplicate keys fail closed,
#   - missing trailing newline on the final line is parsed,
#   - CRLF and whitespace behaviors are correct,
#   - inline '#' characters are preserved verbatim in values,
#   - NUL bytes and bad permissions fail closed.
#
# Requires: bash, coreutils.
# Run: scripts/test-backup-env-parser.sh
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARSER_SH="$ROOT/deploy/backup-env-parser.sh"

TMP="$(mktemp -d "${TMPDIR:-/tmp}/test-env-parser.XXXXXX")"
chmod 0700 "$TMP"
PASS=0
FAIL=0
trap 'rm -rf -- "$TMP"' EXIT

# shellcheck disable=SC1090,SC1091
source "$PARSER_SH"

run_test() {
  local name="$1" expected_rc="$2"
  shift 2
  local env_file="$TMP/test.env"
  cat > "$env_file"
  chmod 0600 "$env_file"

  # Run in subshell so exports do not pollute parent environment
  local rc=0 out=""
  set +e
  out=$(
    set -e
    parse_backup_env "$env_file" "$@"
    # Print exported vars of interest if requested
    for k in $BACKUP_ENV_ALLOWED_KEYS; do
      if [[ -n "${!k+x}" ]]; then
        printf '%s=%s\n' "$k" "${!k}"
      fi
    done
  ) 2>&1
  rc=$?
  set -e

  if (( rc == expected_rc )); then
    PASS=$((PASS + 1))
    echo "ok:   $name"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name (expected rc $expected_rc, got $rc)"
    printf '      output: %s\n' "$out" | head -n 5
    return 1
  fi
  printf '%s' "$out" > "$TMP/.last_out"
}

# 1. Valid basic configuration
run_test "valid_basic_config" 0 <<'EOF'
BACKUP_AGE_RECIPIENT=age1testrecipient
BACKUP_RCLONE_REMOTE=my-remote
BACKUP_RCLONE_PATH=backups/prod
EOF
grep -q 'BACKUP_AGE_RECIPIENT=age1testrecipient' "$TMP/.last_out" || { echo "FAIL: value mismatch"; FAIL=$((FAIL+1)); }

# 2. Matching double quotes stripped
run_test "matching_double_quotes" 0 <<'EOF'
BACKUP_AGE_RECIPIENT="age1quotedrecipient"
BACKUP_RCLONE_PATH="/my/path"
EOF
grep -q 'BACKUP_AGE_RECIPIENT=age1quotedrecipient' "$TMP/.last_out" || { echo "FAIL: double quotes not stripped"; FAIL=$((FAIL+1)); }

# 3. Matching single quotes stripped
run_test "matching_single_quotes" 0 <<'EOF'
BACKUP_AGE_RECIPIENT='age1singlequoted'
BACKUP_RCLONE_PATH='path/with spaces'
EOF
grep -q 'BACKUP_AGE_RECIPIENT=age1singlequoted' "$TMP/.last_out" || { echo "FAIL: single quotes not stripped"; FAIL=$((FAIL+1)); }
grep -q 'BACKUP_RCLONE_PATH=path/with spaces' "$TMP/.last_out" || { echo "FAIL: space in quotes failed"; FAIL=$((FAIL+1)); }

# 4. Empty quotes -> empty value
run_test "empty_quotes" 0 <<'EOF'
BACKUP_DB_PASSWORD=""
BACKUP_AGE_RECIPIENT=''
EOF
grep -q 'BACKUP_DB_PASSWORD=' "$TMP/.last_out" || { echo "FAIL: empty double quotes failed"; FAIL=$((FAIL+1)); }
grep -q 'BACKUP_AGE_RECIPIENT=' "$TMP/.last_out" || { echo "FAIL: empty single quotes failed"; FAIL=$((FAIL+1)); }

# 5. Unmatched quote kept literal (no error, literal value)
run_test "unmatched_quotes_literal" 0 <<'EOF'
BACKUP_DB_PASSWORD="unmatched
BACKUP_RCLONE_PATH=path'
EOF
grep -q 'BACKUP_DB_PASSWORD="unmatched' "$TMP/.last_out" || { echo "FAIL: unmatched quote modified"; FAIL=$((FAIL+1)); }
grep -q "BACKUP_RCLONE_PATH=path'" "$TMP/.last_out" || { echo "FAIL: unmatched single quote modified"; FAIL=$((FAIL+1)); }

# 6. Preserves whitespace inside quotes, strips outside quotes
run_test "whitespace_in_quotes" 0 <<'EOF'
BACKUP_DB_PASSWORD=   "  secret with spaces  "
EOF
grep -q 'BACKUP_DB_PASSWORD=  secret with spaces  ' "$TMP/.last_out" || { echo "FAIL: inner quoted whitespace not preserved"; FAIL=$((FAIL+1)); }

# 7. Final line without newline
printf 'BACKUP_AGE_RECIPIENT=age1nonewline' > "$TMP/nonewline.env"
chmod 0600 "$TMP/nonewline.env"
if ( parse_backup_env "$TMP/nonewline.env" >/dev/null 2>&1 ); then
  PASS=$((PASS + 1)); echo "ok:   final_line_without_newline_parsed"
else
  FAIL=$((FAIL + 1)); echo "FAIL: final line without newline rejected"
fi

# 8. CRLF Windows line endings
printf 'BACKUP_AGE_RECIPIENT=age1crlf\r\nBACKUP_RCLONE_REMOTE=remote\r\n' > "$TMP/crlf.env"
chmod 0600 "$TMP/crlf.env"
if ( parse_backup_env "$TMP/crlf.env" >/dev/null 2>&1 ); then
  PASS=$((PASS + 1)); echo "ok:   crlf_parsed_cleanly"
else
  FAIL=$((FAIL + 1)); echo "FAIL: CRLF file rejected"
fi

# 9. Duplicate key rejected (fail closed)
run_test "duplicate_key_rejected" 1 <<'EOF'
BACKUP_AGE_RECIPIENT=age1first
BACKUP_AGE_RECIPIENT=age1second
EOF

# 10. Dangerous process variable override rejected (PATH)
run_test "path_override_rejected" 1 <<'EOF'
PATH=/tmp/evil:/bin
BACKUP_AGE_RECIPIENT=age1test
EOF

# 11. Dangerous process variable override rejected (LD_PRELOAD)
run_test "ld_preload_rejected" 1 <<'EOF'
LD_PRELOAD=/tmp/bad.so
BACKUP_AGE_RECIPIENT=age1test
EOF

# 12. Dangerous process variable override rejected (IFS)
run_test "ifs_override_rejected" 1 <<'EOF'
IFS=:
BACKUP_AGE_RECIPIENT=age1test
EOF

# 13. Shell command evaluation NEVER happens ($(...))
PWN_FILE="$TMP/pwned_cmd"
run_test "shell_cmd_eval_prevented" 0 <<EOF
BACKUP_RCLONE_PATH=\$(touch "$PWN_FILE")
EOF
if [[ -e "$PWN_FILE" ]]; then
  echo "FAIL: shell command inside \$(...) was executed!"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   dollar_parens_not_evaluated"
fi
# shellcheck disable=SC2016
grep -q 'BACKUP_RCLONE_PATH=$(touch ' "$TMP/.last_out" || { echo "FAIL: literal value lost"; FAIL=$((FAIL+1)); }

# 14. Shell command evaluation NEVER happens (backticks)
PWN_FILE2="$TMP/pwned_backticks"
run_test "backtick_eval_prevented" 0 <<EOF
BACKUP_RCLONE_PATH=\`touch "$PWN_FILE2"\`
EOF
if [[ -e "$PWN_FILE2" ]]; then
  echo "FAIL: shell command inside backticks was executed!"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   backticks_not_evaluated"
fi

# 15. Inline '#' character preserved in passwords
run_test "inline_hash_preserved" 0 <<'EOF'
BACKUP_DB_PASSWORD=my#super#secret
BACKUP_AGE_RECIPIENT="age1#recipient"
EOF
grep -q 'BACKUP_DB_PASSWORD=my#super#secret' "$TMP/.last_out" || { echo "FAIL: inline hash stripped from unquoted value"; FAIL=$((FAIL+1)); }
grep -q 'BACKUP_AGE_RECIPIENT=age1#recipient' "$TMP/.last_out" || { echo "FAIL: inline hash stripped from quoted value"; FAIL=$((FAIL+1)); }

# 16. Pure comment lines and blank lines ignored
run_test "comments_and_blanks_ignored" 0 <<'EOF'
# This is a full comment

# Another comment with spaces
BACKUP_AGE_RECIPIENT=age1valid

   # Indented comment
BACKUP_RCLONE_REMOTE=remote1
EOF
grep -q 'BACKUP_AGE_RECIPIENT=age1valid' "$TMP/.last_out" || { echo "FAIL: valid var after comments missing"; FAIL=$((FAIL+1)); }

# 17. Non KEY=VALUE line rejected
run_test "invalid_syntax_line_rejected" 1 <<'EOF'
BACKUP_AGE_RECIPIENT=age1valid
THIS LINE HAS NO EQUALS SIGN
BACKUP_RCLONE_REMOTE=remote1
EOF

# 18. Key with invalid characters rejected (e.g. hyphen or dot)
run_test "invalid_key_chars_rejected" 1 <<'EOF'
BACKUP-AGE-RECIPIENT=age1valid
EOF

# 19. NUL byte in file rejected
printf 'BACKUP_AGE_RECIPIENT=age1\000evil\n' > "$TMP/nul.env"
chmod 0600 "$TMP/nul.env"
if ( parse_backup_env "$TMP/nul.env" >/dev/null 2>&1 ); then
  echo "FAIL: NUL byte file accepted"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   nul_byte_file_rejected"
fi

# 20. enforce_perms rejects mode 0644 (mode 0600 must be accepted)
# change mode to 0644 before calling parser
printf 'BACKUP_AGE_RECIPIENT=age1valid\n' > "$TMP/test.env"
chmod 0644 "$TMP/test.env"
if ( parse_backup_env "$TMP/test.env" enforce_perms >/dev/null 2>&1 ); then
  echo "FAIL: enforce_perms accepted mode 0644"; FAIL=$((FAIL+1))
else
  PASS=$((PASS + 1)); echo "ok:   enforce_perms_rejects_mode_0644"
fi
# and mode 0600 must be accepted
chmod 0600 "$TMP/test.env"
if ( parse_backup_env "$TMP/test.env" enforce_perms >/dev/null 2>&1 ); then
  PASS=$((PASS + 1)); echo "ok:   enforce_perms_accepts_mode_0600"
else
  echo "FAIL: enforce_perms rejected mode 0600"; FAIL=$((FAIL+1))
fi

echo
echo "PASS: $PASS  FAIL: $FAIL"
if (( FAIL > 0 )); then
  echo "TEST-BACKUP-ENV-PARSER: FAIL"
  exit 1
fi
echo "TEST-BACKUP-ENV-PARSER: PASS"
exit 0
