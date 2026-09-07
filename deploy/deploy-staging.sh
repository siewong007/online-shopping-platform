#!/usr/bin/env bash
# Deploy online-shopping-platform on the AIC cloud VPS.
#
# Usage (as root):
#   deploy.sh <7-to-40-char-hex-git-ref> <extracted-release-directory>
#
# Verifies the release payload checksum, loads the Docker images, generates
# persistent secrets on first run, backs up the existing database, applies
# checksummed SQL migrations, brings the stack up, waits for every service to
# become healthy, configures the host
# Caddy site block, and rolls the application images back when a release
# fails. It never contacts a registry, Secrets Manager, or Route53 — DNS is
# handled separately by Terraform in the payroll-system repo, and the deploy
# itself is a plain SSH release.
set -Eeuo pipefail
umask 077

# Paths are overridable via DEPLOY_* so the pre-deploy backup function can be exercised in tests.
readonly APP_DIR="${DEPLOY_APP_DIR:-/opt/online-shopping-staging}"
readonly RELEASES_DIR="${DEPLOY_RELEASES_DIR:-$APP_DIR/releases}"
readonly COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"
readonly SECRETS_FILE="${DEPLOY_SECRETS_FILE:-$APP_DIR/secrets.env}"
readonly CURRENT_TAG_FILE="${DEPLOY_CURRENT_TAG_FILE:-$APP_DIR/current-tag}"
readonly ADMIN_PASSWORD_FILE="${DEPLOY_ADMIN_PASSWORD_FILE:-$APP_DIR/initial-admin-password}"
readonly BACKUP_DIR="${DEPLOY_BACKUP_DIR:-$APP_DIR/backups}"
readonly LOCK_FILE="${DEPLOY_LOCK_FILE:-$APP_DIR/deploy.lock}"
readonly SYSTEMD_DIR="${DEPLOY_SYSTEMD_DIR:-/etc/systemd/system}"
readonly CADDY_FILE=/etc/caddy/Caddyfile
readonly CADDY_SITE_FILE=/etc/caddy/ekowayhardware-staging.Caddyfile

log() { printf '[online-shopping-deploy] %s\n' "$*"; }
die() { printf '[online-shopping-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
# shellcheck disable=SC1091,SC1090
if ! source "$SCRIPT_DIR/backup-env-parser.sh" 2>/dev/null \
  && ! source "$APP_DIR/backup-env-parser.sh" 2>/dev/null; then
  die "backup-env-parser.sh is missing next to deploy.sh and in $APP_DIR; refusing to deploy without the strict parser"
fi
if ! command -v parse_backup_env >/dev/null 2>&1; then
  die "backup-env-parser.sh failed to load (parse_backup_env not defined); refusing to deploy"
fi
# D2/D6: the shared age-header recipient-stanza check (and capacity rule) live in
# backup-capacity.sh, ONE definition used by backup.sh, restore.sh and deploy.sh.
# shellcheck disable=SC1091,SC1090
if ! source "$SCRIPT_DIR/backup-capacity.sh" 2>/dev/null \
  && ! source "$APP_DIR/backup-capacity.sh" 2>/dev/null; then
  die "backup-capacity.sh is missing next to deploy.sh and in $APP_DIR; refusing to deploy without the shared backup rules"
fi
if ! command -v age_header_has_recipient_stanza >/dev/null 2>&1; then
  die "backup-capacity.sh failed to load (age_header_has_recipient_stanza not defined); refusing to deploy"
fi

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
}

install_backup_components() {
  # STAGING: never install/overwrite host systemd units shared with production
  # (online-shopping-backup*.service/timer). Copy scripts under APP_DIR only.
  log "Staging: installing backup scripts under $APP_DIR only (no systemd units)"
  install -m 0750 "$RELEASE_DIR/backup.sh" "$APP_DIR/backup.sh" 2>/dev/null || true
  install -m 0750 "$RELEASE_DIR/restore.sh" "$APP_DIR/restore.sh" 2>/dev/null || true
  install -m 0644 "$RELEASE_DIR/backup-capacity.sh" "$APP_DIR/backup-capacity.sh" 2>/dev/null || true
  install -m 0644 "$RELEASE_DIR/backup-env-parser.sh" "$APP_DIR/backup-env-parser.sh" 2>/dev/null || true
  install -m 0750 "$RELEASE_DIR/preflight-backup.sh" "$APP_DIR/preflight-backup.sh" 2>/dev/null || true
  install -m 0750 "$RELEASE_DIR/check-backup-health.sh" "$APP_DIR/check-backup-health.sh" 2>/dev/null || true
  install -m 0750 "$RELEASE_DIR/notify-backup-failure.sh" "$APP_DIR/notify-backup-failure.sh" 2>/dev/null || true
  install -m 0644 "$RELEASE_DIR/backup.env.example" "$APP_DIR/backup.env.example" 2>/dev/null || true
  log "Staging: encrypted backup systemd units intentionally NOT installed"
  return 0
}


install_disk_usage_monitor() {
  # STAGING: do not overwrite production online-shopping-disk-usage.* units
  log "Staging: disk-usage systemd monitor intentionally NOT installed"
  install -m 0750 "$RELEASE_DIR/check-disk-usage.sh" "$APP_DIR/check-disk-usage.sh" 2>/dev/null || true
  return 0
}


verify_backup_components() {
  # STAGING: no off-server backup verification (no backup.env / timers)
  log "Staging: skipping off-server backup verification"
  return 0
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
    --project-name online-shopping-staging \
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
  local run_migrations=${2:-yes}
  export IMAGE_TAG=$target_tag
  compose config >/dev/null || return 1
  compose up --detach postgres || return 1
  wait_for_healthy online-shopping-staging-db || return 1
  if [[ "$run_migrations" == yes ]]; then
    apply_pending_migrations || return 1
  fi
  compose up --detach --remove-orphans backend frontend || return 1
  wait_for_healthy online-shopping-staging-backend || return 1
  wait_for_healthy online-shopping-staging-frontend || return 1
  curl -fsS http://127.0.0.1:4002/api/health >/dev/null || return 1
  curl -fsS http://127.0.0.1:8084/health >/dev/null || return 1
}

apply_pending_migrations() {
  local migration filename version checksum recorded legacy_crlf_checksum

  compose exec -T postgres psql \
    -v ON_ERROR_STOP=1 -U shop_admin -d online_shopping <<'SQL'
CREATE TABLE IF NOT EXISTS app_schema_migrations (
    version     INTEGER PRIMARY KEY,
    filename    TEXT NOT NULL UNIQUE,
    checksum    TEXT NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

  for migration in "$APP_DIR/initdb"/[0-9][0-9][0-9][0-9]_*.sql; do
    [[ -f "$migration" ]] || continue
    filename=${migration##*/}
    version=${filename%%_*}
    if [[ ! "$version" =~ ^[0-9]{4}$ ]]; then
      log "Invalid migration filename: $filename"
      return 1
    fi
    checksum=$(sha256sum "$migration" | cut -d' ' -f1)
    recorded=$(compose exec -T postgres psql \
      -v ON_ERROR_STOP=1 -U shop_admin -d online_shopping -Atc \
      "SELECT checksum FROM app_schema_migrations WHERE version = $((10#$version))")

    if [[ -n "$recorded" ]]; then
      if [[ "$recorded" != "$checksum" ]]; then
        # Migrations 0001-0027 were initially baselined on Windows before the release runner
        # existed. Prove an old checksum is the byte-identical CRLF form before replacing it
        # with the canonical LF Git-blob checksum. Any other difference still fails closed.
        legacy_crlf_checksum=$(sed 's/$/\r/' "$migration" | sha256sum | cut -d' ' -f1)
        if [[ "$recorded" != "$legacy_crlf_checksum" ]]; then
          log "Migration checksum changed after application: $filename"
          return 1
        fi

        log "Normalizing verified legacy CRLF checksum for $filename"
        compose exec -T postgres psql \
          -v ON_ERROR_STOP=1 -U shop_admin -d online_shopping -c \
          "UPDATE app_schema_migrations SET checksum = '$checksum' WHERE version = $((10#$version)) AND checksum = '$recorded'" \
          >/dev/null || return 1
        recorded=$(compose exec -T postgres psql \
          -v ON_ERROR_STOP=1 -U shop_admin -d online_shopping -Atc \
          "SELECT checksum FROM app_schema_migrations WHERE version = $((10#$version))")
        if [[ "$recorded" != "$checksum" ]]; then
          log "Failed to normalize migration checksum: $filename"
          return 1
        fi
      fi
      continue
    fi

    log "Applying database migration $filename"
    {
      printf 'BEGIN;\n'
      cat "$migration"
      printf "\nINSERT INTO app_schema_migrations (version, filename, checksum) VALUES (%d, '%s', '%s');\nCOMMIT;\n" \
        "$((10#$version))" "$filename" "$checksum"
    } | compose exec -T postgres psql \
      -v ON_ERROR_STOP=1 -U shop_admin -d online_shopping || return 1
  done
}

show_diagnostics() {
  compose ps >&2 || true
  compose logs --no-color --tail 100 postgres backend frontend >&2 || true
}

backup_existing_database() {
  # STAGING: skip encrypted pre-deploy dumps (no backup.env / age recipient on staging).
  # Staging DB is disposable seed data; production backups are untouched.
  log "Staging: skipping pre-deploy database backup"
  return 0
}


configure_caddy() {
  local site_tmp main_backup site_backup=""
  site_tmp=$(mktemp "$APP_DIR/.ekowayhardware-staging.Caddyfile.XXXXXX")
  main_backup=$(mktemp "$APP_DIR/.Caddyfile.XXXXXX")
  cp -p "$CADDY_FILE" "$main_backup"
  if [[ -f "$CADDY_SITE_FILE" ]]; then
    site_backup=$(mktemp "$APP_DIR/.ekowayhardware-staging.Caddyfile.previous.XXXXXX")
    cp -p "$CADDY_SITE_FILE" "$site_backup"
  fi

  install -m 0644 "$RELEASE_DIR/ekowayhardware-staging.Caddyfile" "$site_tmp"

  hash_file="$APP_DIR/basic-auth.hash"
  if [[ ! -s "$hash_file" ]]; then
    die "missing $hash_file — create with: caddy hash-password --plaintext '…' > $hash_file"
  fi
  HASH=$(tr -d '\n' < "$hash_file")
  sed -i "s|__STAGING_BASIC_AUTH_HASH__|${HASH}|g" "$site_tmp"

  install -m 0644 "$site_tmp" "$CADDY_SITE_FILE"
  if ! grep -Fqx "import $CADDY_SITE_FILE" "$CADDY_FILE"; then
    printf '\n# online-shopping STAGING (managed by /opt/online-shopping-staging/deploy.sh)\nimport %s\n' \
      "$CADDY_SITE_FILE" >> "$CADDY_FILE"
  fi

  if ! caddy validate --config "$CADDY_FILE"; then
    cp -p "$main_backup" "$CADDY_FILE"
    if [[ -n "$site_backup" ]]; then
      cp -p "$site_backup" "$CADDY_SITE_FILE"
    else
      rm -f "$CADDY_SITE_FILE"
    fi
    rm -f "$site_tmp" "$main_backup" "$site_backup"
    return 1
  fi

  if ! systemctl reload caddy; then
    cp -p "$main_backup" "$CADDY_FILE"
    if [[ -n "$site_backup" ]]; then
      cp -p "$site_backup" "$CADDY_SITE_FILE"
    else
      rm -f "$CADDY_SITE_FILE"
    fi
    systemctl reload caddy || true
    rm -f "$site_tmp" "$main_backup" "$site_backup"
    return 1
  fi

  rm -f "$site_tmp" "$main_backup"
  [[ -n "$site_backup" ]] && rm -f "$site_backup"
  return 0
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

# N3: an INDEPENDENT hard minimum for the release bundle. The manifest alone cannot self-validate
# — a manifest that is empty, truncated, malformed or silently missing a line must fail the
# deploy. This static list CANNOT drift with release-components.txt (CI also asserts every
# runtime script dependency appears in the manifest), and the count check makes a truncated
# manifest fail even when every present file happens to exist.
readonly RELEASE_HARD_MIN_COMPONENTS="deploy.sh docker-compose.prod.yml ekowayhardware-staging.Caddyfile \
backup.sh backup-capacity.sh backup-env-parser.sh restore.sh backup.env.example \
online-shopping-backup.service online-shopping-backup.timer online-shopping-backup-health.service \
online-shopping-backup-health.timer online-shopping-backup-notify.service notify-backup-failure.sh \
preflight-backup.sh check-backup-health.sh check-disk-usage.sh upgrade-postgres-cluster.sh \
online-shopping-disk-usage.service online-shopping-disk-usage.timer"
read -ra RELEASE_HARD_MIN_ARRAY <<< "$RELEASE_HARD_MIN_COMPONENTS"
readonly RELEASE_HARD_MIN_ARRAY
readonly MIN_RELEASE_COMPONENT_COUNT=${#RELEASE_HARD_MIN_ARRAY[@]}

verify_release_payload() {
  # C1: the release bundle is REQUIRED to ship every component listed in release-components.txt —
  # the SAME manifest the CI workflow uses to build the bundle, so the two cannot drift. A
  # new-format release missing any component (deploy.sh, compose file, Caddyfile, backup suite,
  # backup-env-parser.sh, preflight-backup.sh, check-backup-health.sh, systemd units) fails loudly
  # before anything is loaded or deployed. The SHA256SUMS check in main_deploy then folds every
  # shipped file into the integrity verification.
  local dir="$1" missing=0 count=0 component src target
  # N3: independent hard minimum — checked even when the manifest itself is absent/empty.
  for component in "${RELEASE_HARD_MIN_ARRAY[@]}"; do
    if [[ ! -f "$dir/$component" ]]; then
      log "release payload is missing $component"
      missing=1
    fi
  done
  if [[ ! -f "$dir/release-components.txt" ]]; then
    log "release payload is missing release-components.txt"
    missing=1
  else
    while IFS=$'\t' read -r src target || [[ -n "$src" ]]; do
      [[ -n "$src" ]] || continue   # trailing empty line (file ends with a newline)
      if [[ -z "$target" ]]; then
        log "release-components.txt contains a malformed line (no TAB-separated target): '$src'"
        missing=1
        continue
      fi
      count=$((count + 1))
      if [[ ! -f "$dir/$target" ]]; then
        log "release payload is missing $target"
        missing=1
      fi
    done < "$dir/release-components.txt"
    if (( count < MIN_RELEASE_COMPONENT_COUNT )); then
      log "release-components.txt declares only $count components (independent minimum $MIN_RELEASE_COMPONENT_COUNT); the manifest is empty, truncated or malformed"
      missing=1
    fi
  fi
  [[ -f "$dir/SHA256SUMS" ]] || { log "release payload is missing SHA256SUMS"; missing=1; }
  [[ -f "$dir/images/backend.tar.gz" ]] || { log "release payload is missing images/backend.tar.gz"; missing=1; }
  [[ -f "$dir/images/frontend.tar.gz" ]] || { log "release payload is missing images/frontend.tar.gz"; missing=1; }
  [[ -d "$dir/initdb" ]] || { log "release payload is missing initdb/"; missing=1; }
  if (( missing != 0 )); then
    die "release bundle is missing required components; refusing to deploy"
  fi
}

main_deploy() {
  local TAG="${1:-}" RELEASE_DIR="${2:-}"

  [[ $EUID -eq 0 ]] || die "run this script as root (sudo)"
  [[ "$TAG" =~ ^[0-9a-f]{7,40}$ ]] || die "image tag must be a 7-to-40-character lowercase hex git ref"
  [[ -n "$RELEASE_DIR" && -d "$RELEASE_DIR" ]] || die "release directory does not exist: $RELEASE_DIR"

  install -d -m 0750 "$APP_DIR" "$RELEASES_DIR"
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another online-shopping deployment is already running"

  verify_release_payload "$RELEASE_DIR"

  (
    cd "$RELEASE_DIR"
    sha256sum --check SHA256SUMS
  ) || die "release checksum verification failed"

  command -v docker >/dev/null 2>&1 || die "docker is not installed on this host"
  docker compose version >/dev/null 2>&1 || die "docker compose plugin is not installed on this host"
  command -v caddy >/dev/null 2>&1 || die "host Caddy is missing"
  [[ -f "$CADDY_FILE" ]] || die "host Caddyfile is missing: $CADDY_FILE"

  ensure_secrets
  backup_existing_database
  install_release_files
  install_backup_components
  install_disk_usage_monitor
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
    log "Release $TAG is healthy on localhost:4002 and localhost:8084"
    log "Caddy is configured for https://staging.ekowayhardware.com"
    verify_backup_components
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
    if deploy_tag "$previous_tag" no; then
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
}

# The whole entrypoint is behind a source guard so scripts/test-predeploy.sh can load the function
# definitions (including backup_existing_database) and exercise them with stub tools.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main_deploy "$@"
fi
