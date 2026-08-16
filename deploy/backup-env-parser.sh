#!/usr/bin/env bash
#
# Shared, safe parser for /opt/online-shopping/backup.env (and test copies).
#
# WHY NOT `source`: sourcing evaluates the file as shell code, so a malformed or malicious
# line (e.g. `BACKUP_RCLONE_PATH=$(rm -rf /)`) executes. This parser reads the file as a
# strict KEY=VALUE document and exports only valid, allowlisted variable assignments. It rejects:
#   - keys that are not bare identifiers [A-Za-z_][A-Za-z0-9_]* (anchored; the whole string must
#     match, so `KEY` followed by junk can never sneak in),
#   - keys outside the supported BACKUP_* allowlist (see BACKUP_ENV_ALLOWED_KEYS below) — an
#     unknown key or attempt to override process variables (PATH, LD_PRELOAD, etc.) is a hard error,
#   - duplicate keys (fail closed: the second occurrence is a hard error),
#   - lines that are not `KEY=VALUE` or a pure comment,
#   - files containing a NUL byte (bash would silently truncate such a value).
#
# Value semantics (documented):
#   - the final line is processed even when the file has no trailing newline,
#   - a single pair of matching surrounding quotes is stripped: KEY="value" and KEY='value' both
#     parse to the exact value `value`; an unmatched or lone quote is left as literal text,
#   - trailing whitespace (spaces/tabs) is trimmed; leading whitespace on the line is trimmed,
#   - `$...` and backticks are literal data, never evaluated (no shell evaluation),
#   - inline `#` characters are NOT stripped: `KEY=value # note` keeps `value # note` verbatim,
#     ensuring passwords containing `#` are not corrupted,
#   - a trailing CR (Windows line endings) is removed,
#   - an empty value is legal (later per-key validation decides whether it is required).
#
# SECURITY (M4): when `parse_backup_env <file> enforce_perms` is used the file must be
# owned by root and not readable by group/other (mode group/other bits zero). As root this
# is enforced strictly; as a non-root operator (tests, manual restore) ownership cannot be
# verified, so only the mode check is enforced and the caller is responsible for intent.
#
# Usage:
#   source deploy/backup-env-parser.sh
#   parse_backup_env /opt/online-shopping/backup.env [enforce_perms]
# After a successful parse the exported variables are the KEY=VALUE pairs in the file.

# The complete set of supported configuration keys. Everything else is rejected.
readonly BACKUP_ENV_ALLOWED_KEYS="BACKUP_AGE_RECIPIENT BACKUP_RCLONE_REMOTE BACKUP_RCLONE_PATH
BACKUP_RCLONE_CONTIMEOUT BACKUP_RCLONE_TIMEOUT BACKUP_LOCAL_DIR BACKUP_LOCAL_RETENTION_COUNT
BACKUP_REMOTE_DAILY_RETENTION BACKUP_REMOTE_WEEKLY_RETENTION BACKUP_WEEKLY_DAY BACKUP_DB_CONTAINER
BACKUP_DB_USER BACKUP_DB_NAME BACKUP_DB_PASSWORD"

# Anchored identifier: the WHOLE key must match (no trailing junk, no '=', no '-', no quotes).
BACKUP_ENV_KEY_RE='^[A-Za-z_][A-Za-z0-9_]*$'

# Internal: fail the caller. The parser is shared so it cannot assume its own log prefix;
# it prints to stderr and returns nonzero. Callers trap ERR, so a parse failure aborts them.
parse_env_fail() {
  printf 'backup-env-parser: ERROR: %s\n' "$*" >&2
  return 1
}

parse_backup_env() {
  local file="$1" enforce="${2:-}" line key value
  [[ -f "$file" && -r "$file" ]] || { parse_env_fail "configuration file not found or not readable: $file"; return 1; }

  # Bash variables cannot hold a NUL byte, so a NUL anywhere in the file silently
  # truncates a value. Detect it at the byte level before parsing (strict parser).
  local byte_count stripped_count
  byte_count=$(wc -c < "$file")
  stripped_count=$(LC_ALL=C tr -d '\000' < "$file" | wc -c)
  if [[ "$stripped_count" != "$byte_count" ]]; then
    parse_env_fail "configuration file contains a NUL byte: $file"
    return 1
  fi

  if [[ "$enforce" == "enforce_perms" ]]; then
    local owner mode
    owner=$(stat -c %U "$file" 2>/dev/null) || { parse_env_fail "cannot stat $file"; return 1; }
    mode=$(stat -c %a "$file" 2>/dev/null) || { parse_env_fail "cannot stat $file"; return 1; }
    if [[ $EUID -eq 0 && "$owner" != "root" ]]; then
      parse_env_fail "$file must be owned by root (owner is $owner); refusing to load group-or-other-visible backup configuration"
      return 1
    fi
    if (( (8#$mode & 8#77) != 0 )); then
      parse_env_fail "$file must have mode 0600 (group/other bits unset; current mode $mode); refusing to load backup configuration"
      return 1
    fi
  fi

  # Duplicate-key detection. `local -A` is bash 4+; the parser targets bash (shebang) on Linux.
  local -A seen=()
  local lineno=0
  # The allowlist is defined across multiple lines; normalize newlines to spaces so the
  # whitespace-delimited containment check below works for keys at the end of a line.
  local allowlist
  allowlist=$(printf '%s' "$BACKUP_ENV_ALLOWED_KEYS" | tr '\n' ' ')
  # `|| [[ -n "$line" ]]` makes read process the FINAL line even when the file has no trailing
  # newline (bash's read returns nonzero at EOF-without-newline but still has the content).
  while IFS= read -r line || [[ -n "$line" ]]; do
    lineno=$((lineno + 1))
    line=${line%$'\r'}                    # Windows line ending
    line=${line#"${line%%[![:space:]]*}"} # strip leading whitespace on line
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" != *=* ]]; then
      parse_env_fail "line $lineno: expected KEY=VALUE or a comment, got: $line"
      return 1
    fi
    key=${line%%=*}
    value=${line#*=}
    if [[ ! "$key" =~ $BACKUP_ENV_KEY_RE ]]; then
      parse_env_fail "line $lineno: key is not a valid bare identifier: '$key'"
      return 1
    fi
    if [[ " $allowlist " != *" $key "* ]]; then
      parse_env_fail "line $lineno: key '$key' is not in the supported BACKUP_* allowlist"
      return 1
    fi
    if [[ -n "${seen[$key]:-}" ]]; then
      parse_env_fail "line $lineno: duplicate key '$key' (a key may appear at most once)"
      return 1
    fi
    seen[$key]=1
    # Strip outer leading and trailing whitespace from unquoted value
    value=${value#"${value%%[![:space:]]*}"}
    value=${value%"${value##*[![:space:]]}"}
    # Strip ONE matching pair of surrounding quotes so KEY="value" / KEY='value' == value.
    # Unmatched quotes or quotes embedded in the middle are preserved verbatim.
    if [[ "$value" == \"*\" && ${#value} -ge 2 ]]; then
      value=${value:1:${#value}-2}
    elif [[ "$value" == \'*\' && ${#value} -ge 2 ]]; then
      value=${value:1:${#value}-2}
    fi
    # export failures (invalid name, readonly, etc.) must not be silently ignored.
    export "$key=$value" || { parse_env_fail "line $lineno: failed to export '$key'"; return 1; }
  done < "$file"
  return 0
}