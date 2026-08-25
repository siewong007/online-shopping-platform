#!/usr/bin/env bash
#
# One-shot PostgreSQL cluster upgrade for the online-shopping production stack
# (ekowayhardware.com, Lightsail VPS). Moves the existing data cluster to a new
# postgres image tag whose CATALOG_VERSION_NO differs from the one the cluster
# was initialized with (e.g. 19beta1 -> 19beta3). A same-major catalog bump
# refuses to start ("database files are incompatible with server"); the only
# path forward is dump -> fresh cluster -> restore.
#
# What it does, in order (every step fail-closed):
#   0. preflight: root, layout, healthy stack, distinct tags, disk capacity
#   1. consistent pg_dump -Fc of the application database, verified with
#      pg_restore -l (TABLE DATA must be present)
#   2. stop app containers, stop postgres, tar-snapshot the data volume
#   3. flip the image tag in the live docker-compose.prod.yml (.bak kept)
#   4. drop the data volume, start the new engine (fresh initdb)
#   5. pg_restore the dump back in (--exit-on-error), then ANALYZE
#   6. start the full stack and gate on every container health check plus the
#      loopback HTTP health endpoints, exactly like deploy.sh does
#
# Any failure AFTER step 3 triggers an automatic best-effort rollback: restore
# the .bak compose file, recreate the volume from the tar snapshot, restart the
# old engine and gate its health. If even that fails, manual commands are
# printed. The verified dump always remains on disk either way.
#
# Roles and passwords are NOT migrated: POSTGRES_USER/POSTGRES_PASSWORD come
# from the unchanged compose environment, so the fresh cluster already has the
# application superuser and database; only schema + data move across.
#
# DRY_RUN=1 performs preflight only (fully read-only) and prints the plan.
#
# Usage (on the VPS):
#   sudo ./upgrade-postgres-cluster.sh <target-tag> [--yes]
#   sudo DRY_RUN=1 ./upgrade-postgres-cluster.sh 19beta3
#
# Environment overrides (tests / unusual layouts):
#   PGU_APP_DIR, PGU_COMPOSE_FILE, PGU_CONTAINER, PGU_DB_USER, PGU_DATABASE,
#   PGU_SNAPSHOT_IMAGE, PGU_HEALTH_TIMEOUT_SECS, PGU_REQUIRED_MB.
#
# After a successful run you MUST ship the matching tag flip in Git (see
# docs/postgres-cluster-upgrade-runbook.md) or the next automated deploy will
# recreate the old-version container again.
set -Eeuo pipefail

readonly P="[online-shopping-pg-upgrade]"
log() { printf '%s %s\n' "$P" "$*"; }
die() { printf '%s ERROR: %s\n' "$P" "$*" >&2; exit 1; }

TARGET_TAG="${1:-}"
CONFIRMED="${2:-}"
DRY_RUN="${DRY_RUN:-0}"
APP_DIR="${PGU_APP_DIR:-/opt/online-shopping}"
COMPOSE_FILE="${PGU_COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"
CONTAINER="${PGU_CONTAINER:-online-shopping-db}"
DB_USER="${PGU_DB_USER:-shop_admin}"
DATABASE="${PGU_DATABASE:-online_shopping}"
SNAPSHOT_IMAGE="${PGU_SNAPSHOT_IMAGE:-busybox:1.36}"
HEALTH_TIMEOUT="${PGU_HEALTH_TIMEOUT_SECS:-240}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
WORK_DIR="$APP_DIR/pg-upgrade-$TS"
VOLUME=""
SNAPSHOT=""
COMPOSE_BAK=""
STAGE="preflight"

usage() { die "usage: $0 <target-tag> [--yes]  (e.g. $0 19beta3)"; }
[[ -n "$TARGET_TAG" ]] || usage
[[ "$CONFIRMED" == "--yes" || -z "$CONFIRMED" ]] || usage

wait_healthy() {
  local c="$1" deadline=$(( SECONDS + HEALTH_TIMEOUT )) st=""
  while (( SECONDS < deadline )); do
    st="$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo missing)"
    case "$st" in
      healthy) log "$c is healthy"; return 0 ;;
      unhealthy|exited|dead) log "$c entered state: $st"; return 1 ;;
    esac
    sleep 5
  done
  log "$c did not become healthy before the timeout (last state: ${st:-missing})"
  return 1
}

rollback() {
  log "ROLLBACK triggered after failure in stage: $STAGE"
  docker stop "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "$COMPOSE_BAK" && -f "$COMPOSE_BAK" ]]; then
    cp "$COMPOSE_BAK" "$COMPOSE_FILE"
    log "restored $COMPOSE_FILE from $COMPOSE_BAK"
  fi
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [[ -n "$COMPOSE_BAK" ]]; then
    # Only after the tag flip is the volume a fresh, disposable cluster; before
    # that it still holds the only copy of the original data.
    docker volume rm "$VOLUME" >/dev/null 2>&1 || true
    if [[ -n "$SNAPSHOT" && -f "$SNAPSHOT" ]]; then
      docker run --rm -v "$VOLUME:/var/lib/postgresql" -v "$APP_DIR:/src:ro" \
        "$SNAPSHOT_IMAGE" tar xzf "/src/$(basename "$SNAPSHOT")" -C /var/lib/postgresql \
        >/dev/null 2>&1 || { log "CRITICAL: could not restore the volume snapshot"; manual_rescue; return 1; }
    else
      log "CRITICAL: snapshot archive missing"; manual_rescue; return 1
    fi
  fi
  if [[ -n "$COMPOSE_BAK" ]]; then
    docker compose --project-directory "$APP_DIR" --file "$COMPOSE_FILE" up -d \
      >/dev/null 2>&1 || { log "CRITICAL: could not restart the old stack"; manual_rescue; return 1; }
  else
    # Pre-flip failure: containers were only stopped, the old cluster is intact.
    docker start "$CONTAINER" >/dev/null 2>&1 || { manual_rescue; return 1; }
    docker start online-shopping-backend online-shopping-frontend >/dev/null 2>&1 || true
  fi
  wait_healthy "$CONTAINER" || { manual_rescue; return 1; }
  wait_healthy online-shopping-backend || { manual_rescue; return 1; }
  wait_healthy online-shopping-frontend || { manual_rescue; return 1; }
  log "Rollback succeeded - old engine postgres:${CURRENT_TAG:-unknown} is serving again"
  log "The verified dump is at ${WORK_DIR:-unknown}/db.dump - keep it for diagnosis"
}

manual_rescue() {
  cat >&2 <<RESCUE

AUTOMATIC ROLLBACK FAILED. Manual recovery, as root on this host:
  cp ${COMPOSE_BAK:-$COMPOSE_FILE.bak-*} $COMPOSE_FILE
  docker rm -f $CONTAINER
  docker volume rm $VOLUME
  docker run --rm -v $VOLUME:/var/lib/postgresql -v $APP_DIR:/src:ro \\
    busybox tar xzf /src/$(basename "${SNAPSHOT:-UNKNOWN}") -C /var/lib/postgresql
  docker compose --project-directory $APP_DIR --file $COMPOSE_FILE up -d
Then watch: docker inspect -f '{{.State.Health.Status}}' $CONTAINER
RESCUE
}

trap 'rc=$?; (( rc == 0 )) || [[ "$STAGE" == "preflight" || "$STAGE" == "dump" ]] || rollback; exit $rc' EXIT

# ---------------------------------------------------------------- preflight --

[[ $(id -u) -eq 0 ]] || die "must run as root (sudo)"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
[[ -d "$APP_DIR/backups" ]] || die "layout unexpected: $APP_DIR/backups missing"
[[ ! -e "$APP_DIR/deploy.lock" ]] || die "a deploy appears to be in progress ($APP_DIR/deploy.lock)"
docker inspect "$CONTAINER" >/dev/null 2>&1 || die "container $CONTAINER not found or not created"

VOLUME="$(docker inspect "$CONTAINER" --format \
  '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql"}}{{.Name}}{{end}}{{end}}')"
[[ -n "$VOLUME" ]] || die "could not resolve the postgres data volume from $CONTAINER"
docker volume inspect "$VOLUME" >/dev/null 2>&1 || die "volume $VOLUME not found"

CURRENT_TAG="$(awk '$1 == "image:" && $2 ~ /^postgres:/ { sub(/^postgres:/, "", $2); print; exit }' "$COMPOSE_FILE")"
[[ -n "$CURRENT_TAG" ]] || die "could not parse the postgres image tag from $COMPOSE_FILE"
SNAPSHOT="$APP_DIR/pgdata-$CURRENT_TAG-$TS.tar.gz"
[[ "$CURRENT_TAG" != "$TARGET_TAG" ]] || die "compose already pins postgres:$TARGET_TAG - nothing to upgrade"

for c in "$CONTAINER" online-shopping-backend online-shopping-frontend; do
  st="$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo missing)"
  [[ "$st" == "healthy" ]] || die "$c is not healthy (state: $st); fix the stack before upgrading"
done

REQUIRED_MB="${PGU_REQUIRED_MB:-512}"
AVAILABLE_MB="$(df -Pm "$APP_DIR" | awk 'NR==2 {print $4}')"
(( AVAILABLE_MB >= REQUIRED_MB )) \
  || die "only ${AVAILABLE_MB}MB free under $APP_DIR (need ~${REQUIRED_MB}MB for the dump + volume snapshot)"

log "plan: postgres:$CURRENT_TAG -> postgres:$TARGET_TAG"
log "  volume:          $VOLUME"
log "  dump:            $WORK_DIR/db.dump (pg_dump -Fc, verified with pg_restore -l)"
log "  volume snapshot: $SNAPSHOT"
log "  compose backup:  $COMPOSE_FILE.bak-$TS"
if [[ "$DRY_RUN" == "1" ]]; then
  log "DRY_RUN=1 - preflight passed, nothing was touched."
  exit 0
fi
if [[ "$CONFIRMED" != "--yes" ]]; then
  read -r -p "$P Proceed with the upgrade? Type 'upgrade' to continue: " reply
  [[ "$reply" == "upgrade" ]] || die "aborted by operator"
fi

# ---------------------------------------------------------------------- dump --

STAGE="dump"
mkdir -p "$WORK_DIR"
chmod 0700 "$WORK_DIR"
log "taking a consistent dump of $DATABASE..."
docker exec "$CONTAINER" pg_dump -Fc -U "$DB_USER" "$DATABASE" > "$WORK_DIR/db.dump"
DUMP_BYTES="$(wc -c < "$WORK_DIR/db.dump")"
(( DUMP_BYTES > 4096 )) || die "dump is only ${DUMP_BYTES} bytes; refusing to continue"
docker exec -i "$CONTAINER" pg_restore -l < "$WORK_DIR/db.dump" | grep -q "TABLE DATA" \
  || die "dump listing shows no TABLE DATA; refusing to continue"
chmod 0600 "$WORK_DIR/db.dump"
log "dump verified ($DUMP_BYTES bytes): $WORK_DIR/db.dump"

# --------------------------------------------------- stop stack and snapshot --

STAGE="snapshot"
log "stopping application containers..."
docker stop online-shopping-frontend >/dev/null
docker stop online-shopping-backend >/dev/null
log "stopping postgres..."
docker stop "$CONTAINER" >/dev/null

log "snapshotting the data volume (this can take a moment)..."
docker pull -q "$SNAPSHOT_IMAGE" >/dev/null
docker run --rm -v "$VOLUME:/var/lib/postgresql:ro" -v "$APP_DIR:/dst" \
  "$SNAPSHOT_IMAGE" tar czf "/dst/$(basename "$SNAPSHOT")" -C /var/lib/postgresql .
SNAP_BYTES="$(wc -c < "$SNAPSHOT")"
(( SNAP_BYTES > 1024 )) || die "volume snapshot is only ${SNAP_BYTES} bytes"
log "volume snapshot written: $SNAPSHOT ($SNAP_BYTES bytes)"

# ------------------------------------------------------------------ flip tag --

STAGE="flip"
COMPOSE_BAK="$COMPOSE_FILE.bak-$TS"
cp "$COMPOSE_FILE" "$COMPOSE_BAK"
sed -i -E "s#^([[:space:]]*image: postgres:).*#\1$TARGET_TAG#" "$COMPOSE_FILE"
grep -Eq "^([[:space:]]*image: postgres:)$TARGET_TAG$" "$COMPOSE_FILE" \
  || die "tag flip verification failed in $COMPOSE_FILE"
log "compose now pins postgres:$TARGET_TAG (backup: $COMPOSE_BAK)"

# ------------------------------------------------------- new cluster + restore --

STAGE="restore"
log "removing the old cluster volume and starting postgres:$TARGET_TAG..."
docker rm -f "$CONTAINER" >/dev/null
docker volume rm "$VOLUME" >/dev/null
docker compose --project-directory "$APP_DIR" --file "$COMPOSE_FILE" up -d postgres >/dev/null
wait_healthy "$CONTAINER" || die "new engine never became healthy - check docker logs $CONTAINER"

log "restoring the dump into the fresh cluster..."
docker exec -i "$CONTAINER" pg_restore --no-owner --role "$DB_USER" --exit-on-error \
  -U "$DB_USER" -d "$DATABASE" < "$WORK_DIR/db.dump" \
  || die "pg_restore failed - the dump is intact at $WORK_DIR/db.dump"
docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DATABASE" -c "ANALYZE;" >/dev/null
log "restore complete, planner statistics refreshed"

# ------------------------------------------------------------ start and gate --

STAGE="verify"
log "starting the full stack..."
docker compose --project-directory "$APP_DIR" --file "$COMPOSE_FILE" up -d >/dev/null
wait_healthy online-shopping-backend
wait_healthy online-shopping-frontend
curl -fsS http://127.0.0.1:4000/api/health >/dev/null || die "backend health endpoint failed"
curl -fsS http://127.0.0.1:8082/health >/dev/null || die "frontend health endpoint failed"

STAGE="done"
trap - EXIT
log "SUCCESS: running on postgres:$TARGET_TAG with restored data"
log "keep until the soak window ends:"
log "  dump:            $WORK_DIR/db.dump"
log "  volume snapshot: $SNAPSHOT"
log "  compose backup:  $COMPOSE_BAK"
log "NEXT STEPS:"
log "  1. smoke-test the site, then ship the matching Git tag flip (runbook step 5)"
log "  2. after the soak window, clean up: rm -rf $WORK_DIR $SNAPSHOT $COMPOSE_BAK"
