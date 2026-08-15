#!/usr/bin/env bash
#
# Shared, safe parser for /opt/online-shopping/backup.env (and test copies).
#
# WHY NOT `source`: sourcing evaluates the file as shell code, so a malformed or malicious
# line (e.g. `BACKUP_RCLONE_PATH=$(rm -rf /)`) executes. This parser reads the file as a
# strict KEY=VALUE document and exports only valid variable assignments. It rejects:
#   - non-identifier keys (anything not [A-Za-z_][A-Za-z0-9_]*),
#   - lines that are not `KEY=VALUE` or a pure comment,
#   - files containing a NUL byte (bash would silently truncate such a value).
# Values are unquoted once (leading/trailing single or double quotes are stripped) and a
# trailing CR (Windows line endings) is removed. `$...` and backticks are treated as
# literal text, never evaluated.
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

# Internal: fail the caller. The parser is shared so it cannot assume its own log prefix;
# it prints to stderr and returns nonzero. Callers trap ERR, so a parse failure aborts them.
parse_env_fail() {
  printf 'backup-env-parser: ERROR: %s\n' "$*" >&2
  return 1
}

parse_backup_env() {
  local file="$1" enforce="${2:-}" line key value qa
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

  local lineno=0
  while IFS= read -r line; do
    lineno=$((lineno + 1))
    line=${line%$'\r'}
    line=${line#"${line%%[![:space:]]*}"}
    [[ -z "$line" || "$line" == \#* ]] && continue
    case "$line" in
      *=*)
        key=${line%%=*}
        value=${line#*=}
        case "$key" in
          [A-Za-z_][A-Za-z0-9_]*)
            ;;
          *)
            parse_env_fail "line $lineno: key is not a valid identifier: '$key'"
            return 1
            ;;
        esac
        # Strip one matching pair of surrounding quotes (single or double).
        qa=${value%\"}
        if [[ "$value" == \"* && "$qa" != "$value" ]]; then
          value=${value#\"}
        fi
        qa=${value%\'}
        if [[ "$value" == \'* && "$qa" != "$value" ]]; then
          value=${value#\'}
        fi
        export "$key=$value"
        ;;
      *)
        parse_env_fail "line $lineno: expected KEY=VALUE or a comment, got: $line"
        return 1
        ;;
    esac
  done < "$file"
  return 0
}