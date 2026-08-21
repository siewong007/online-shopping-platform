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
#       by backup.sh, deploy.sh and restore.sh so the check is ONE definition (D2/D6). FAILS
#       CLOSED on internal tool errors (M3): only an explicitly numeric POSITIVE stanza count
#       passes, so a failed grep/awk can never be misread as "no stanza".
#   safe_rm_target <target>
#       fail-closed cleanup used by the restore-proof/atomicity harnesses (M1): removes a
#       throwaway target container ONLY when BOTH the target identity and the production identity
#       resolve AND are proven different. If either identity is empty (unresolvable) or the two
#       are equal, nothing is removed and the refusal is logged — an unresolvable production
#       identity must NEVER become a deletion.
#   publish_no_clobber <src> <dir> <stem> [max_attempts]
#       atomically publishes <src> as <dir>/<stem>.dump.age via a hard link and removes <src> on
#       success (M2). `ln` succeeds only when the destination did NOT exist, so a racing writer is
#       never overwritten; collisions retry with an incrementing numeric suffix and exhaustion
#       fails closed (prints the final path on success, exits 1 otherwise after cleaning <src>).
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
  # M3: fail CLOSED on internal tool errors. `|| true` keeps this set -e-safe, but if awk or grep
  # failed internally the match string would be EMPTY (not "0") — an empty string must be
  # REJECTED, never treated as "no stanza". Only an explicitly numeric POSITIVE count passes.
  [[ "$matches" =~ ^[0-9]+$ ]] || return 1
  (( matches > 0 )) || return 1
}

# M1: fail-closed cleanup for the restore-proof/atomicity harnesses. A throwaway target may be
# removed ONLY when BOTH the target identity and the production identity resolve and are proven
# DIFFERENT. If either identity is empty (unresolvable) or the two are equal, NOTHING is removed
# and the refusal is logged — an unresolvable production identity is NEVER interpreted as
# "production is absent" and must never turn into a destructive docker rm.
safe_rm_target() {
  local target="${1:-}" target_id prod_id
  [[ -n "$target" && "$target" != "${RP_PROD_CONTAINER:-online-shopping-db}" ]] || {
    echo "cleanup: skipping target removal '$target' — empty or canonical production name" >&2
    return 0
  }
  target_id=$(docker inspect --format '{{.Id}}' "$target" 2>/dev/null | tr -d ' \r\n' || true)
  prod_id=$(docker inspect --format '{{.Id}}' "${RP_PROD_CONTAINER:-online-shopping-db}" 2>/dev/null | tr -d ' \r\n' || true)
  if [[ -n "$target_id" && -n "$prod_id" && "$target_id" != "$prod_id" ]]; then
    docker rm -f "$target" >/dev/null 2>&1 || true
  else
    echo "cleanup: skipping target removal '$target' — could not prove it is distinct from production (target_id=${target_id:-<unresolved>} prod_id=${prod_id:-<unresolved>})" >&2
  fi
}

# M2: atomically publish a produced file under a no-clobber name and consume the source. A hard
# link (`ln`) is the publication primitive: it is ATOMIC and its exit status is RELIABLE — it
# succeeds ONLY when the destination did not already exist (EEXIST otherwise). `mv -n` is NOT
# reliable here: GNU mv may return 0 when the destination exists and the source is left untouched
# (RENAME_NOREPLACE is only attempted on Linux and silently degrades to a plain rename/overwrite
# on filesystems without it), so its exit status cannot be trusted to mean a move happened. On
# collision the destination is retried with an incrementing numeric suffix; the source temp file
# is removed ONLY after a successful link (consumed exactly once). Prints the final destination
# path on success; on `max_attempts` collisions it removes the source and returns 1 (fail closed).
# Error classification: a failed `ln` is a COLLISION only when the destination name is actually
# occupied (EEXIST); a failure with the name absent (EXDEV/EACCES/ENOSPC/EPERM) can never be
# fixed by retrying a different name, so it fails closed IMMEDIATELY instead of burning
# `max_attempts` fake collision retries.
publish_no_clobber() {
  local src="$1" dir="$2" stem="$3" max="${4:-100}" attempt=0 candidate
  [[ -f "$src" ]] || return 1
  candidate="$dir/$stem.dump.age"
  while ! ln "$src" "$candidate" 2>/dev/null; do
    [[ -e "$candidate" || -L "$candidate" ]] || { rm -f -- "$src"; return 1; }
    attempt=$((attempt + 1))
    (( attempt < max )) || { rm -f -- "$src"; return 1; }
    candidate="$dir/$stem-${attempt}.dump.age"
  done
  rm -f -- "$src"
  printf '%s\n' "$candidate"
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