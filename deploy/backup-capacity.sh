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
# Functions (this file is sourced, never executed):
#   estimate_backup_unit <db_size_bytes_or_empty> <prior_unit_bytes_or_empty> [floor_bytes]
#       prints max(largest prior archive, live DB size, floor). Empty or non-numeric inputs are
#       ignored; the 100 MiB floor applies when both are missing or below it.
#   required_backup_space <estimate_unit_bytes> <retention_count>
#       prints unit * (retention_count + 2) + 512 MiB.
#   filesystem_avail <dir>
#       prints the free bytes on <dir> (df --output=avail -B1) or nothing on failure.
set -Eeuo pipefail

readonly BACKUP_CAPACITY_FLOOR_BYTES=104857600        # 100 MiB minimum baseline
readonly BACKUP_CAPACITY_HEADROOM_BYTES=536870912     # 512 MiB fixed safety margin

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