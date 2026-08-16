#!/usr/bin/env bash
#
# Shared capacity rule for the online-shopping encrypted backup pipeline (N5).
#
# deploy/backup.sh, scripts/preflight-backup.sh and deploy/restore.sh's pre-restore safety
# snapshot MUST all use this single rule, so the preflight verdict and a real backup run can
# never disagree:
#
#   estimate_unit = max(previous successful archive size, current DB-size estimate, 100 MiB floor)
#   required      = estimate_unit * (retention_count + 2) + 512 MiB fixed safety margin
#
# (retention_count + 2 covers the copies already retained, the one new archive, and the staging
# area; the 512 MiB margin absorbs growth of the database during the dump and provider hiccups.)
#
# The local retention count is ALSO resolved here (D1): backup.sh and the preflight must agree on
# the default and on what counts as valid, because the strict parser exports only keys PRESENT in
# backup.env — an OMITTED BACKUP_LOCAL_RETENTION_COUNT stays unset and previously meant "3" for
# backup.sh but "0" for the preflight, so the preflight could pass while a backup run failed.
#
# Functions (this file is sourced, never executed):
#   estimate_backup_unit <db_size_bytes_or_empty> <prior_unit_bytes_or_empty> [floor_bytes]
#       prints max(largest prior archive, live DB size, floor). Empty or non-numeric inputs are
#       ignored; the 100 MiB floor applies when both are missing or below it.
#   required_backup_space <estimate_unit_bytes> <retention_count>
#       prints unit * (retention_count + 2) + 512 MiB.
#   filesystem_avail <dir>
#       prints the free bytes on <dir> (df --output=avail -B1) or nothing on failure.
#   resolve_backup_retention_count
#       prints BACKUP_LOCAL_RETENTION_COUNT if set, else the shared default (3); rejects
#       non-numeric and non-positive values with exit 1 (mirrors backup.sh's validation, so an
#       explicit value can never be accepted by one component and rejected by the other).
#   age_header_has_recipient_stanza <file>
#       returns 0 iff <file>'s age header (bounded by the `--- ` MAC line or a 16-line cap, never
#       the encrypted body) contains a well-formed `-> X25519 <ephemeral>` recipient stanza. Used
#       by backup.sh, deploy.sh and restore.sh so the check is ONE definition (D2/D6).
set -Eeuo pipefail

readonly BACKUP_CAPACITY_FLOOR_BYTES=104857600        # 100 MiB minimum baseline
readonly BACKUP_CAPACITY_HEADROOM_BYTES=536870912     # 512 MiB fixed safety margin
readonly BACKUP_DEFAULT_RETENTION_COUNT=3             # D1: ONE shared default for both components

resolve_backup_retention_count() {
  local value="${BACKUP_LOCAL_RETENTION_COUNT:-$BACKUP_DEFAULT_RETENTION_COUNT}"
  [[ "$value" =~ ^[0-9]+$ && "$value" -ge 1 ]] || {
    echo "backup-capacity: BACKUP_LOCAL_RETENTION_COUNT must be a positive integer (got: $value)" >&2
    return 1
  }
  printf '%s\n' "$value"
}

# N10/D6: only the age HEADER is scanned for the recipient stanza. The header is bounded by the
# `--- ` MAC line (the last header line in the age format) or a small fixed line cap, so a stray
# blank line or a truncated header cannot widen or shift the scan window, and the encrypted body
# is NEVER scanned.
# NOTE: grep -q must NOT be used — it exits on the first match, SIGPIPEs the awk that is still
# writing the rest of a large file, and pipefail then reports 141 (a false negative). grep -c
# reads to EOF, so the result is deterministic; the `|| true` keeps the helper set -e-safe, so
# callers MUST use it as `if ! age_header_has_recipient_stanza ...` (a bare
# `stanza_count=$(... | grep -c ...)` assignment would fail the script before its cleanup/fail
# could run when zero lines match — the D2 bug).
age_header_has_recipient_stanza() {
  local file="$1" matches
  [[ -r "$file" ]] || return 1
  matches=$(awk 'NR > 16 {exit} /^--- /{exit} {print}' "$file" | grep -acE '^-> X25519 [A-Za-z0-9+/]{43,44}$' || true)
  [[ "$matches" != "0" ]]
}

estimate_backup_unit() {
  local db_size="${1:-}" prior="${2:-}" floor="${3:-$BACKUP_CAPACITY_FLOOR_BYTES}" unit
  [[ "$db_size" =~ ^[0-9]+$ ]] || db_size=""
  [[ "$prior" =~ ^[0-9]+$ ]] || prior=""
  [[ "$floor" =~ ^[0-9]+$ ]] || floor="$BACKUP_CAPACITY_FLOOR_BYTES"
  unit=$floor
  [[ -n "$db_size" && "$db_size" -gt "$unit" ]] && unit=$db_size
  [[ -n "$prior" && "$prior" -gt "$unit" ]] && unit=$prior
  printf '%s\n' "$unit"
}

required_backup_space() {
  local unit="${1:-0}" retention="${2:-0}"
  [[ "$unit" =~ ^[0-9]+$ ]] || unit=0
  [[ "$retention" =~ ^[0-9]+$ ]] || retention=0
  printf '%s\n' "$(( unit * (retention + 2) + BACKUP_CAPACITY_HEADROOM_BYTES ))"
}

filesystem_avail() {
  local dir="$1"
  df --output=avail -B1 "$dir" 2>/dev/null | tail -n 1 | tr -d ' '
}