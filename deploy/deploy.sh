#!/usr/bin/env bash
# Deploy online-shopping-platform on the shared payroll/saliminn Lightsail VPS.
#
# Usage (as root):
#   deploy.sh <7-to-40-char-hex-git-ref> <extracted-release-directory>
#
# Verifies the release payload checksum, loads the Docker images, generates
# persistent secrets on first run, backs up the existing database, brings the
# stack up, waits for every service to become healthy, configures the host
# Caddy site block, and rolls the application images back when a release
# fails. It never contacts a registry, Secrets Manager, or Route53 — DNS is
# handled separately by Terraform in the payroll-system repo, and the deploy
# itself is a plain SSH release.
set -Eeuo pipefail
umask 077

readonly APP_DIR=/opt/online-shopping
readonly RELEASES_DIR="$APP_DIR/releases"
readonly COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
readonly SECRETS_FILE="$APP_DIR/secrets.env"
readonly CURRENT_TAG_FILE="$APP_DIR/current-tag"
readonly ADMIN_PASSWORD_FILE="$APP_DIR/initial-admin-password"
readonly BACKUP_DIR="$APP_DIR/backups"
readonly LOCK_FILE="$APP_DIR/deploy.lock"
readonly CADDY_FILE=/etc/caddy/Caddyfile
readonly CADDY_SITE_FILE=/etc/caddy/ekowayhardware.Caddyfile

TAG="${1:-}"
RELEASE_DIR="${2:-}"

log() { printf '[online-shopping-deploy] %s\n' "$*"; }
die() { printf '[online-shopping-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run this script as root (sudo)"
[[ "$TAG" =~ ^[0-9a-f]{7,40}$ ]] || die "image tag must be a 7-to-40-character lowercase hex git ref"
[[ -n "$RELEASE_DIR" && -d "$RELEASE_DIR" ]] || die "release directory does not exist: $RELEASE_DIR"

install -d -m 0750 "$APP_DIR" "$RELEASES_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || die "another online-shopping deployment is already running"

required_payload=(
  deploy.sh
  docker-compose.prod.yml
  SHA256SUMS
  images/backend.tar.gz
  images/frontend.tar.gz
)
for payload in "${required_payload[@]}"; do
  [[ -f "$RELEASE_DIR/$payload" ]] || die "release payload is missing $payload"
done
[[ -d "$RELEASE_DIR/initdb" ]] || die "release payload is missing initdb/"

(
  cd "$RELEASE_DIR"
  sha256sum --check SHA256SUMS
) || die "release checksum verification failed"

command -v docker >/dev/null 2>&1 || die "docker is not installed on this host"
docker compose version >/dev/null 2>&1 || die "docker compose plugin is not installed on this host"
command -v caddy >/dev/null 2>&1 || die "host Caddy is missing"
[[ -f "$CADDY_FILE" ]] || die "host Caddyfile is missing: $CADDY_FILE"

ensure_secrets() {
  if [[ ! -f "$SECRETS_FILE" ]]; then
    log "Generating persistent database and admin-seed secrets on the VPS"
    local secrets_tmp
    secrets_tmp=$(mktemp "$APP_DIR/.secrets.env.XXXXXX")
    printf 'POSTGRES_PASSWORD=%s\nADMIN_SEED_PASSWORD=%s\n' \
      "$(openssl rand -hex 32)" \
      "$(openssl rand -hex 16)" > "$secrets_tmp"
    chmod 0600 "$secrets_tmp"
    mv "$secrets_tmp" "$SECRETS_FILE"
  fi

  chmod 0600 "$SECRETS_FILE"
  set -a
  # This root-owned file is generated immediately above.
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
  set +a

  [[ "${POSTGRES_PASSWORD:-}" =~ ^[A-Za-z0-9]{32,}$ ]] \
    || die "POSTGRES_PASSWORD in $SECRETS_FILE must be at least 32 hex characters"
  [[ "${ADMIN_SEED_PASSWORD:-}" =~ ^[A-Za-z0-9]{16,}$ ]] \
    || die "ADMIN_SEED_PASSWORD in $SECRETS_FILE must be at least 16 hex characters"

  if [[ ! -f "$ADMIN_PASSWORD_FILE" ]]; then
    printf 'username=admin\npassword=%s\ngenerated at %s\n' \
      "$ADMIN_SEED_PASSWORD" "$(date -u +%FT%TZ)" > "$ADMIN_PASSWORD_FILE"
    chmod 0600 "$ADMIN_PASSWORD_FILE"
    log "Initial admin credential written to $ADMIN_PASSWORD_FILE (root-only)"
  fi
}

install_release_files() {
  install -m 0644 "$RELEASE_DIR/docker-compose.prod.yml" "$COMPOSE_FILE"
  install -m 0750 "$RELEASE_DIR/deploy.sh" "$APP_DIR/deploy.sh"
  # The official PostgreSQL entrypoint processes these files as its non-root
  # postgres user, so this read-only directory must be traversable by it.
  install -d -m 0755 "$APP_DIR/initdb"
  install -m 0644 "$RELEASE_DIR"/initdb/*.sql "$APP_DIR/initdb/"

  cat > /etc/logrotate.d/online-shopping <<'LOGROTATE'
/opt/online-shopping/logs/*.log {
    daily
    maxsize 10M
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
    copytruncate
}
LOGROTATE
  chmod 0644 /etc/logrotate.d/online-shopping
}

load_release_images() {
  log "Loading application images for $TAG"
  gzip -dc "$RELEASE_DIR/images/backend.tar.gz" | docker load >/dev/null
  gzip -dc "$RELEASE_DIR/images/frontend.tar.gz" | docker load >/dev/null
  docker image inspect "online-shopping-backend:$TAG" >/dev/null
  docker image inspect "online-shopping-frontend:$TAG" >/dev/null
  [[ $(docker image inspect --format '{{.Architecture}}' "online-shopping-backend:$TAG") == amd64 ]] \
    || die "backend image architecture is not amd64"
  [[ $(docker image inspect --format '{{.Architecture}}' "online-shopping-frontend:$TAG") == amd64 ]] \
    || die "frontend image architecture is not amd64"

  if ! docker image inspect postgres:19beta1 >/dev/null 2>&1; then
    log "Pulling postgres:19beta1 (first deployment only)"
    docker pull postgres:19beta1 >/dev/null
  fi
}

compose() {
  docker compose \
    --project-name online-shopping \
    --file "$COMPOSE_FILE" \
    "$@"
}

container_health() {
  docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$1" 2>/dev/null || true
}

wait_for_healthy() {
  local container=$1
  local deadline=$((SECONDS + 180))
  local status
  while (( SECONDS < deadline )); do
    status=$(container_health "$container")
    case "$status" in
      healthy) log "$container is healthy"; return 0 ;;
      exited|dead|unhealthy) log "$container entered state: $status"; return 1 ;;
    esac
    sleep 3
  done
  log "$container did not become healthy before the timeout (last state: ${status:-missing})"
  return 1
}

deploy_tag() {
  local target_tag=$1
  export IMAGE_TAG=$target_tag
  compose config >/dev/null || return 1
  compose up --detach --remove-orphans || return 1
  wait_for_healthy online-shopping-db || return 1
  wait_for_healthy online-shopping-backend || return 1
  wait_for_healthy online-shopping-frontend || return 1
  curl -fsS http://127.0.0.1:4000/api/health >/dev/null || return 1
  curl -fsS http://127.0.0.1:8082/health >/dev/null || return 1
}

show_diagnostics() {
  compose ps >&2 || true
  compose logs --no-color --tail 100 postgres backend frontend >&2 || true
}

backup_existing_database() {
  [[ $(docker inspect --format '{{.State.Running}}' online-shopping-db 2>/dev/null || true) == true ]] || return 0

  install -d -m 0700 "$BACKUP_DIR"
  local timestamp backup_tmp backup_path
  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  backup_path="$BACKUP_DIR/predeploy-$timestamp.dump"
  backup_tmp=$(mktemp "$BACKUP_DIR/.predeploy.XXXXXX")
  log "Creating local pre-deploy database backup"
  if docker exec online-shopping-db \
    pg_dump --format=custom --no-owner --no-acl -U shop_admin online_shopping \
    > "$backup_tmp"; then
    chmod 0600 "$backup_tmp"
    mv "$backup_tmp" "$backup_path"
  else
    rm -f "$backup_tmp"
    die "database backup failed; refusing to deploy"
  fi

  local backups=() index
  mapfile -t backups < <(
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'predeploy-*.dump' -printf '%T@ %p\n' \
      | sort -nr | cut -d' ' -f2-
  )
  for ((index = 3; index < ${#backups[@]}; index++)); do
    rm -f -- "${backups[$index]}"
  done
}

configure_caddy() {
  local site_tmp main_backup site_backup=""
  site_tmp=$(mktemp "$APP_DIR/.ekowayhardware.Caddyfile.XXXXXX")
  main_backup=$(mktemp "$APP_DIR/.Caddyfile.XXXXXX")
  cp -p "$CADDY_FILE" "$main_backup"
  if [[ -f "$CADDY_SITE_FILE" ]]; then
    site_backup=$(mktemp "$APP_DIR/.ekowayhardware.Caddyfile.previous.XXXXXX")
    cp -p "$CADDY_SITE_FILE" "$site_backup"
  fi

  cat > "$site_tmp" <<'CADDY'
ekowayhardware.com {
    encode zstd gzip

    header ?Strict-Transport-Security "max-age=31536000; includeSubDomains"

    @backend path /api /api/*
    handle @backend {
        reverse_proxy 127.0.0.1:4000
    }

    handle {
        reverse_proxy 127.0.0.1:8082
    }
}

www.ekowayhardware.com {
    redir https://ekowayhardware.com{uri} permanent
}
CADDY

  install -m 0644 "$site_tmp" "$CADDY_SITE_FILE"
  if ! grep -Fqx "import $CADDY_SITE_FILE" "$CADDY_FILE"; then
    printf '\n# online-shopping-platform (managed by /opt/online-shopping/deploy.sh)\nimport %s\n' \
      "$CADDY_SITE_FILE" >> "$CADDY_FILE"
  fi

  if ! caddy validate --config "$CADDY_FILE"; then
    cp -p "$main_backup" "$CADDY_FILE"
    [[ -n "$site_backup" ]] && cp -p "$site_backup" "$CADDY_SITE_FILE" || rm -f "$CADDY_SITE_FILE"
    rm -f "$site_tmp" "$main_backup" "$site_backup"
    return 1
  fi

  if ! systemctl reload caddy; then
    cp -p "$main_backup" "$CADDY_FILE"
    [[ -n "$site_backup" ]] && cp -p "$site_backup" "$CADDY_SITE_FILE" || rm -f "$CADDY_SITE_FILE"
    systemctl reload caddy || true
    rm -f "$site_tmp" "$main_backup" "$site_backup"
    return 1
  fi

  rm -f "$site_tmp" "$main_backup"
  [[ -n "$site_backup" ]] && rm -f "$site_backup"
}

cleanup_old_releases() {
  local keep_current=$1 keep_previous=$2 directory basename
  for directory in "$RELEASES_DIR"/*; do
    [[ -d "$directory" ]] || continue
    basename=${directory##*/}
    if [[ "$basename" != "$keep_current" && "$basename" != "$keep_previous" ]]; then
      rm -rf -- "$directory"
    fi
  done
}

cleanup_old_images() {
  local repository=$1 keep_current=$2 keep_previous=$3 image_tag
  while IFS= read -r image_tag; do
    [[ -n "$image_tag" && "$image_tag" != '<none>' ]] || continue
    if [[ "$image_tag" != "$keep_current" && "$image_tag" != "$keep_previous" ]]; then
      docker image rm "$repository:$image_tag" >/dev/null 2>&1 || true
    fi
  done < <(docker image ls "$repository" --format '{{.Tag}}')
}

ensure_secrets
backup_existing_database
install_release_files
load_release_images

previous_tag=""
if [[ -s "$CURRENT_TAG_FILE" ]]; then
  read -r previous_tag < "$CURRENT_TAG_FILE"
  [[ "$previous_tag" =~ ^[0-9a-f]{7,40}$ ]] || previous_tag=""
fi

log "Starting release $TAG"
if deploy_tag "$TAG" && configure_caddy; then
  printf '%s\n' "$TAG" > "$CURRENT_TAG_FILE"
  chmod 0600 "$CURRENT_TAG_FILE"
  cleanup_old_images online-shopping-backend "$TAG" "$previous_tag"
  cleanup_old_images online-shopping-frontend "$TAG" "$previous_tag"
  cleanup_old_releases "$TAG" "$previous_tag"
  log "Release $TAG is healthy on localhost:4000 and localhost:8082"
  log "Caddy is configured for https://ekowayhardware.com"
  exit 0
fi

log "Release $TAG failed; collecting diagnostics"
export IMAGE_TAG=$TAG
show_diagnostics

if [[ -n "$previous_tag" ]] \
  && docker image inspect "online-shopping-backend:$previous_tag" >/dev/null 2>&1 \
  && docker image inspect "online-shopping-frontend:$previous_tag" >/dev/null 2>&1; then
  log "Rolling application containers back to $previous_tag"
  if [[ -f "$RELEASES_DIR/$previous_tag/docker-compose.prod.yml" ]]; then
    install -m 0644 "$RELEASES_DIR/$previous_tag/docker-compose.prod.yml" "$COMPOSE_FILE"
  fi
  if deploy_tag "$previous_tag"; then
    log "Rollback succeeded"
  else
    log "Rollback failed; manual intervention is required"
    show_diagnostics
  fi
else
  log "No complete previous release is available for automatic rollback"
  compose stop backend frontend >/dev/null 2>&1 || true
fi

die "deployment failed"
