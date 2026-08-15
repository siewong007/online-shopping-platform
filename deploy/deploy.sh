#!/usr/bin/env bash
# Deploy online-shopping-platform on the shared payroll/saliminn Lightsail VPS.
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
readonly APP_DIR="${DEPLOY_APP_DIR:-/opt/online-shopping}"
readonly RELEASES_DIR="${DEPLOY_RELEASES_DIR:-$APP_DIR/releases}"
readonly COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-$APP_DIR/docker-compose.prod.yml}"
readonly SECRETS_FILE="${DEPLOY_SECRETS_FILE:-$APP_DIR/secrets.env}"
readonly CURRENT_TAG_FILE="${DEPLOY_CURRENT_TAG_FILE:-$APP_DIR/current-tag}"
readonly ADMIN_PASSWORD_FILE="${DEPLOY_ADMIN_PASSWORD_FILE:-$APP_DIR/initial-admin-password}"
readonly BACKUP_DIR="${DEPLOY_BACKUP_DIR:-$APP_DIR/backups}"
readonly LOCK_FILE="${DEPLOY_LOCK_FILE:-$APP_DIR/deploy.lock}"
readonly SYSTEMD_DIR="${DEPLOY_SYSTEMD_DIR:-/etc/systemd/system}"
readonly CADDY_FILE=/etc/caddy/Caddyfile
readonly CADDY_SITE_FILE=/etc/caddy/ekowayhardware.Caddyfile

log() { printf '[online-shopping-deploy] %s\n' "$*"; }
die() { printf '[online-shopping-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

# shellcheck disable=SC1091,SC1090
source "${BASH_SOURCE[0]%/*}/backup-env-parser.sh" 2>/dev/null \
  || source "$APP_DIR/backup-env-parser.sh"

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

install_backup_components() {
  # Installs the encrypted off-server backup suite (backup.sh, restore.sh, systemd service and
  # timer, config template) shipped in the release bundle (enforced by verify_release_payload).
  #
  # H3 failure policy (documented): a backup-component INSTALL failure is never allowed to turn a
  # safe application deployment into an uncontrolled shell abort. Each failure is caught, reported
  # prominently, and the deployment continues with the protection state made explicit. This is
  # different from bundle validation (verify_release_payload FAILS CLOSED if the release is
  # missing the components) and different from the pre-deploy backup (which aborts the deploy).
  #
  # The timer is only ENABLED once a root-only, mode-0600 /opt/online-shopping/backup.env actually
  # supplies the recipient, remote and path; otherwise the units are installed disabled. H5: merely
  # enabling the timer is reported as "timer ACTIVE; verification pending" — the ACTIVE/VERIFIED
  # claim is only made after a fresh, verified off-server backup in verify_backup_components().
  if [[ ! -f "$RELEASE_DIR/backup.sh" ]]; then
    log "release contains no backup components; scheduled encrypted backups unchanged"
    return 0
  fi

  log "Installing encrypted backup components"
  if ! install -m 0750 "$RELEASE_DIR/backup.sh" "$APP_DIR/backup.sh" \
    || ! install -m 0750 "$RELEASE_DIR/restore.sh" "$APP_DIR/restore.sh" \
    || ! install -m 0644 "$RELEASE_DIR/backup.env.example" "$APP_DIR/backup.env.example"; then
    log "WARNING: failed to install the encrypted backup scripts under $APP_DIR"
    log "         scheduled encrypted backups are NOT AVAILABLE; the application deployment continues"
    log "         investigate permissions/disk space, then reinstall the backup components manually"
    return 0
  fi
  if ! install -m 0644 "$RELEASE_DIR/online-shopping-backup.service" "$SYSTEMD_DIR/online-shopping-backup.service" \
    || ! install -m 0644 "$RELEASE_DIR/online-shopping-backup.timer" "$SYSTEMD_DIR/online-shopping-backup.timer"; then
    log "WARNING: failed to install the backup systemd units into $SYSTEMD_DIR"
    log "         scheduled encrypted backups are NOT ACTIVE; the application deployment continues"
    return 0
  fi
  if ! systemctl daemon-reload; then
    log "WARNING: systemctl daemon-reload failed; scheduled encrypted backups are NOT ACTIVE"
    log "         the application deployment continues"
    return 0
  fi

  # M4: only consider activation when a valid root-owned, mode-0600 backup.env exists. The strict
  # parser never evaluates the file as shell code.
  if [[ -f "$APP_DIR/backup.env" ]] \
    && parse_backup_env "$APP_DIR/backup.env" enforce_perms \
    && [[ -n "${BACKUP_AGE_RECIPIENT:-}" && -n "${BACKUP_RCLONE_REMOTE:-}" && -n "${BACKUP_RCLONE_PATH:-}" ]]; then
    if systemctl enable --now online-shopping-backup.timer >/dev/null 2>&1; then
      log "Scheduled encrypted backups timer ACTIVE; off-server VERIFICATION pending (runs after the stack is healthy)"
    else
      log "WARNING: scheduled encrypted backups are NOT ACTIVE"
      log "         failed to enable online-shopping-backup.timer; the application deployment continues"
      log "         activate manually once systemd is healthy: systemctl enable --now online-shopping-backup.timer"
    fi
  else
    systemctl disable online-shopping-backup.timer >/dev/null 2>&1 || true
    systemctl stop online-shopping-backup.timer >/dev/null 2>&1 || true
    log "Scheduled encrypted backups installed but DISABLED: provision $APP_DIR/backup.env (root-owned, mode 0600)"
    log "with BACKUP_AGE_RECIPIENT, BACKUP_RCLONE_REMOTE and BACKUP_RCLONE_PATH to activate"
  fi
}

verify_backup_components() {
  # H5: "timer enabled" is NOT "protection proven". After the stack is healthy, run the real
  # installed pipeline once. Only a fresh status=="ok" with a non-null remote destination lets us
  # log ACTIVE/VERIFIED; anything else is a prominent, actionable warning (never a deploy failure).
  local rc status_file
  if [[ ! -x "$APP_DIR/backup.sh" ]]; then
    log "WARNING: no installed backup.sh to verify; scheduled encrypted backups are NOT VERIFIED"
    return 0
  fi
  set +e
  "$APP_DIR/backup.sh" >"$APP_DIR/backup-verify.log" 2>&1
  rc=$?
  set -e
  status_file="$APP_DIR/backup-status.json"
  if (( rc == 0 )) && [[ -f "$status_file" ]] \
    && grep -q '"status": "ok"' "$status_file" \
    && grep -q '"remote_destination_identifier": "' "$status_file"; then
    log "Scheduled encrypted backups ACTIVE and VERIFIED: a fresh backup succeeded to the off-server destination"
  else
    log "WARNING: scheduled encrypted backups are NOT VERIFIED"
    log "         the verification backup run failed; see $APP_DIR/backup-verify.log"
    log "         the timer may be enabled, but no fresh off-server backup has been proven yet"
    log "         investigate before relying on scheduled backups: /opt/online-shopping/backup.sh"
  fi
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
  local run_migrations=${2:-yes}
  export IMAGE_TAG=$target_tag
  compose config >/dev/null || return 1
  compose up --detach postgres || return 1
  wait_for_healthy online-shopping-db || return 1
  if [[ "$run_migrations" == yes ]]; then
    apply_pending_migrations || return 1
  fi
  compose up --detach --remove-orphans backend frontend || return 1
  wait_for_healthy online-shopping-backend || return 1
  wait_for_healthy online-shopping-frontend || return 1
  curl -fsS http://127.0.0.1:4000/api/health >/dev/null || return 1
  curl -fsS http://127.0.0.1:8082/health >/dev/null || return 1
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
  # H4: distinguish "container absent" (normal on the very first deploy) from a docker/daemon
  # inspection failure. A daemon problem must NEVER silently skip the required pre-deploy backup.
  local running inspect_err
  inspect_err=$(docker inspect --format '{{.State.Running}}' online-shopping-db 2>&1) || true
  if [[ -z "$inspect_err" ]]; then
    die "pre-deploy backup failed: docker inspect online-shopping-db returned nothing"
  fi
  if [[ "$inspect_err" != "true" && "$inspect_err" != "false" ]]; then
    if grep -qiE 'no such (object|container)' <<<"$inspect_err"; then
      log "no database container present yet; skipping pre-deploy backup"
      return 0
    fi
    if grep -qiE 'cannot connect to the docker daemon|is the docker daemon running|permission denied|got permission denied' <<<"$inspect_err"; then
      die "pre-deploy backup failed: cannot reach the docker daemon ($inspect_err)"
    fi
    die "pre-deploy backup failed: docker inspect online-shopping-db reported: $inspect_err"
  fi
  running="$inspect_err"
  [[ "$running" == "true" ]] || { log "database container not running; skipping pre-deploy backup"; return 0; }

  install -d -m 0700 "$BACKUP_DIR"
  # Mutual exclusion with the scheduled/manual encrypted backup (backup.sh). Block so a deploy
  # never overlaps a running backup and never skips its pre-deploy safety dump. H2: the wait is
  # BOUNDED — a stuck/long-running backup must fail the deploy clearly, not hang it forever.
  exec 8>"$APP_DIR/backup.lock"
  if ! flock -w "${DEPLOY_BACKUP_LOCK_TIMEOUT:-300}" 8; then
    die "pre-deploy backup could not acquire the backup lock within ${DEPLOY_BACKUP_LOCK_TIMEOUT:-300}s; a scheduled or manual backup may be stuck. Retry the deployment after it finishes or investigate."
  fi

  # Secure pre-deploy backup is LOCAL ENCRYPTION ONLY: pg_dump piped through age, no rclone and no
  # network. It must stay available even when the off-server provider is down, and it must never
  # leave a plaintext dump on disk. FAIL CLOSED: without age and BACKUP_AGE_RECIPIENT the deploy
  # aborts instead of writing plaintext.
  local recipient timestamp backup_tmp backup_path
  command -v age >/dev/null 2>&1 \
    || die "secure pre-deploy backup requires 'age' (install age first); refusing to write a plaintext dump"
  # M4: the config must be a valid root-owned, mode-0600 file, parsed by the strict parser (never
  # `source`d as shell code).
  if ! parse_backup_env "$APP_DIR/backup.env" enforce_perms; then
    die "secure pre-deploy backup requires a valid root-only (mode 0600) $APP_DIR/backup.env; refusing to write a plaintext dump"
  fi
  [[ -n "${BACKUP_AGE_RECIPIENT:-}" ]] \
    || die "BACKUP_AGE_RECIPIENT is not set in $APP_DIR/backup.env; refusing to write a plaintext dump"
  recipient="$BACKUP_AGE_RECIPIENT"

  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  backup_path="$BACKUP_DIR/predeploy-$timestamp.dump.age"
  backup_tmp=$(mktemp "$BACKUP_DIR/.predeploy.XXXXXX")
  log "Creating encrypted local pre-deploy database backup (age only; no remote required)"
  log "Backing up database online_shopping"

  local -a pipeline_status
  set +e
  docker exec online-shopping-db \
    pg_dump --format=custom --no-owner --no-acl -U shop_admin online_shopping \
    | age --encrypt --recipient "$recipient" --output "$backup_tmp"
  pipeline_status=("${PIPESTATUS[@]}")
  set -e

  if (( pipeline_status[1] != 0 )); then
    rm -f "$backup_tmp"
    die "pre-deploy backup failed: age encryption failed (exit ${pipeline_status[1]}); deployment aborted"
  fi
  if (( pipeline_status[0] != 0 )); then
    rm -f "$backup_tmp"
    die "pre-deploy backup failed: pg_dump failed (exit ${pipeline_status[0]}); deployment aborted"
  fi
  if [[ ! -s "$backup_tmp" ]]; then
    rm -f "$backup_tmp"
    die "pre-deploy backup failed: encrypted output is empty; deployment aborted"
  fi
  if ! head -c 100 "$backup_tmp" | grep -q '^age-encryption.org/v1'; then
    rm -f "$backup_tmp"
    die "pre-deploy backup failed: encrypted output has no age header; deployment aborted"
  fi

  chmod 0600 "$backup_tmp"
  mv -f "$backup_tmp" "$backup_path"   # atomic rename only after the archive is known valid
  log "Encrypted pre-deploy backup ready: $backup_path"

  # Legacy plaintext pre-deploy dumps must not persist on disk once an encrypted one exists.
  if compgen -G "$BACKUP_DIR/predeploy-*.dump" >/dev/null 2>&1; then
    log "Removing legacy plaintext pre-deploy dumps from $BACKUP_DIR"
    rm -f -- "$BACKUP_DIR"/predeploy-*.dump
  fi

  # M5: retention is ordered by the ISO timestamp embedded in the name (never mtime), so the
  # newest 3 are always kept deterministically.
  local backups=() index
  mapfile -t backups < <(
    find "$BACKUP_DIR" -maxdepth 1 -type f \
      -name 'predeploy-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z.dump.age' \
      -printf '%f\n' | sort -r
  )
  for ((index = 3; index < ${#backups[@]}; index++)); do
    rm -f -- "$BACKUP_DIR/${backups[$index]}"
    log "pruned pre-deploy backup ${backups[$index]}"
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

  install -m 0644 "$RELEASE_DIR/ekowayhardware.Caddyfile" "$site_tmp"

  install -m 0644 "$site_tmp" "$CADDY_SITE_FILE"
  if ! grep -Fqx "import $CADDY_SITE_FILE" "$CADDY_FILE"; then
    printf '\n# online-shopping-platform (managed by /opt/online-shopping/deploy.sh)\nimport %s\n' \
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

verify_release_payload() {
  # C1: the release bundle is REQUIRED to ship the backup components. A new-format release that is
  # missing any of them fails loudly before anything is loaded or deployed. The SHA256SUMS check in
  # main_deploy then folds every shipped file (including these) into the integrity verification.
  local dir="$1" payload missing=0
  for payload in \
    deploy.sh \
    docker-compose.prod.yml \
    ekowayhardware.Caddyfile \
    SHA256SUMS \
    images/backend.tar.gz \
    images/frontend.tar.gz \
    backup.sh \
    restore.sh \
    backup.env.example \
    online-shopping-backup.service \
    online-shopping-backup.timer; do
    if [[ ! -f "$dir/$payload" ]]; then
      log "release payload is missing $payload"
      missing=1
    fi
  done
  [[ -d "$dir/initdb" ]] || { log "release payload is missing initdb/"; missing=1; }
  if (( missing != 0 )); then
    die "release bundle is missing required backup components; refusing to deploy"
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
