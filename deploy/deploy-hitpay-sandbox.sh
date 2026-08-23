#!/usr/bin/env bash
# Deploys only the isolated HitPay sandbox backend on the existing Lightsail VPS.
set -Eeuo pipefail
umask 077

readonly APP_DIR=/opt/online-shopping-hitpay-sandbox
readonly RELEASES_DIR="$APP_DIR/releases"
readonly COMPOSE_FILE="$APP_DIR/docker-compose.hitpay-sandbox.yml"
readonly SECRETS_FILE="$APP_DIR/secrets.env"
readonly CURRENT_TAG_FILE="$APP_DIR/current-tag"
readonly LOCK_FILE="$APP_DIR/deploy.lock"
readonly CADDY_FILE=/etc/caddy/Caddyfile
readonly CADDY_SITE_FILE=/etc/caddy/ekowayhardware.Caddyfile
readonly LEGACY_SANDBOX_SITE_FILE=/etc/caddy/ekoway-hitpay-sandbox.Caddyfile
readonly WEBHOOK_URL=https://ekowayhardware.com/api/payments/hitpay-sandbox/webhook

TAG="${1:-}"
RELEASE_DIR="${2:-}"
CREDENTIAL_IMPORT_FILE="${3:-}"

log() { printf '[hitpay-sandbox-deploy] %s\n' "$*"; }
die() { printf '[hitpay-sandbox-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run this script as root"
[[ "$TAG" =~ ^[0-9a-f]{7,40}$ ]] || die "invalid image tag"
[[ -d "$RELEASE_DIR" ]] || die "release directory is missing"
[[ -f "$CREDENTIAL_IMPORT_FILE" ]] || die "sandbox credential import is missing"

install -d -m 0750 "$APP_DIR" "$RELEASES_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || die "another HitPay sandbox deployment is already running"

required=(
  deploy-hitpay-sandbox.sh
  hitpay-sandbox-uat.sh
  docker-compose.hitpay-sandbox.yml
  SHA256SUMS
  images/backend.tar.gz
  initdb/9000_hitpay_sandbox_seed.sql
)
for file in "${required[@]}"; do
  [[ -f "$RELEASE_DIR/$file" ]] || die "release is missing $file"
done

(
  cd "$RELEASE_DIR"
  sha256sum --check SHA256SUMS
) || die "release checksum verification failed"

command -v docker >/dev/null || die "Docker is missing"
docker compose version >/dev/null || die "Docker Compose is missing"
command -v caddy >/dev/null || die "Caddy is missing"
[[ -f "$CADDY_FILE" ]] || die "host Caddyfile is missing"

ensure_secrets() {
  chmod 0600 "$CREDENTIAL_IMPORT_FILE"
  # This short-lived file contains only the two sandbox values supplied by the
  # protected GitHub environment. It is removed by the workflow after deployment.
  # shellcheck disable=SC1090
  source "$CREDENTIAL_IMPORT_FILE"
  [[ -n "${HITPAY_SANDBOX_API_KEY:-}" ]] || die "sandbox API key is missing"
  [[ -n "${HITPAY_SANDBOX_WEBHOOK_SALT:-}" ]] || die "sandbox webhook salt is missing"
  [[ -z "${HITPAY_PRODUCTION_API_KEY:-}" && -z "${HITPAY_PRODUCTION_WEBHOOK_SALT:-}" ]] \
    || die "production HitPay credentials are forbidden in the sandbox deployment"

  local imported_api_key="$HITPAY_SANDBOX_API_KEY"
  local imported_webhook_salt="$HITPAY_SANDBOX_WEBHOOK_SALT"
  local postgres_password="" admin_password="" secrets_tmp
  if [[ -f "$SECRETS_FILE" ]]; then
    chmod 0600 "$SECRETS_FILE"
    # shellcheck disable=SC1090
    source "$SECRETS_FILE"
    postgres_password="${SANDBOX_POSTGRES_PASSWORD:-}"
    admin_password="${SANDBOX_ADMIN_SEED_PASSWORD:-}"
  fi

  if [[ -z "$postgres_password" ]]; then
    postgres_password=$(openssl rand -hex 32)
  fi
  if [[ -z "$admin_password" ]]; then
    admin_password=$(openssl rand -hex 24)
  fi
  [[ "$postgres_password" =~ ^[A-Za-z0-9]{32,}$ ]] || die "invalid persistent database secret"
  [[ "$admin_password" =~ ^[A-Za-z0-9]{16,}$ ]] || die "invalid persistent admin secret"

  secrets_tmp=$(mktemp "$APP_DIR/.secrets.env.XXXXXX")
  {
    printf 'SANDBOX_POSTGRES_PASSWORD=%q\n' "$postgres_password"
    printf 'SANDBOX_ADMIN_SEED_PASSWORD=%q\n' "$admin_password"
    printf 'HITPAY_SANDBOX_API_KEY=%q\n' "$imported_api_key"
    printf 'HITPAY_SANDBOX_WEBHOOK_SALT=%q\n' "$imported_webhook_salt"
  } > "$secrets_tmp"
  chmod 0600 "$secrets_tmp"
  mv "$secrets_tmp" "$SECRETS_FILE"

  # Export the exact values for Compose without asking it to parse the root-only file.
  export SANDBOX_POSTGRES_PASSWORD="$postgres_password"
  export SANDBOX_ADMIN_SEED_PASSWORD="$admin_password"
  export HITPAY_SANDBOX_API_KEY="$imported_api_key"
  export HITPAY_SANDBOX_WEBHOOK_SALT="$imported_webhook_salt"
}

install_release() {
  install -m 0644 "$RELEASE_DIR/docker-compose.hitpay-sandbox.yml" "$COMPOSE_FILE"
  install -m 0750 "$RELEASE_DIR/deploy-hitpay-sandbox.sh" "$APP_DIR/deploy-hitpay-sandbox.sh"
  install -m 0750 "$RELEASE_DIR/hitpay-sandbox-uat.sh" "$APP_DIR/hitpay-sandbox-uat.sh"
  # PostgreSQL's non-root entrypoint user must be able to traverse this directory.
  install -d -m 0755 "$APP_DIR/initdb"
  install -m 0644 "$RELEASE_DIR"/initdb/*.sql "$APP_DIR/initdb/"
}

compose() {
  docker compose \
    --project-name online-shopping-hitpay-sandbox \
    --file "$COMPOSE_FILE" \
    "$@"
}

wait_for_backend() {
  local deadline=$((SECONDS + 180))
  until curl -fsS http://127.0.0.1:4001/api/health >/dev/null; do
    if (( SECONDS >= deadline )); then
      compose ps >&2 || true
      compose logs --no-color --tail 100 postgres backend >&2 || true
      return 1
    fi
    sleep 3
  done
}

configure_caddy() {
  local main_tmp site_tmp site_candidate main_backup site_backup
  main_tmp=$(mktemp "$APP_DIR/.Caddyfile.candidate.XXXXXX")
  site_tmp=$(mktemp "$APP_DIR/.ekowayhardware.Caddyfile.XXXXXX")
  site_candidate=$(mktemp "$APP_DIR/.ekowayhardware.Caddyfile.candidate.XXXXXX")
  main_backup=$(mktemp "$APP_DIR/.Caddyfile.XXXXXX")
  site_backup=$(mktemp "$APP_DIR/.ekowayhardware.Caddyfile.previous.XXXXXX")
  cp -p "$CADDY_FILE" "$main_backup"
  [[ -f "$CADDY_SITE_FILE" ]] || return 1
  cp -p "$CADDY_SITE_FILE" "$site_backup"
  cp -p "$CADDY_FILE" "$main_tmp"
  cp -p "$CADDY_SITE_FILE" "$site_tmp"

  # Retire the abandoned DNS/subdomain design if an earlier sandbox deployment added it.
  sed -i \
    -e '\|^# Isolated Ekoway HitPay sandbox$|d' \
    -e "\\|^import $LEGACY_SANDBOX_SITE_FILE$|d" \
    "$main_tmp"

  if grep -Fq '@hitpay_sandbox_webhook path /api/payments/hitpay-sandbox/webhook' "$site_tmp"; then
    cp -p "$site_tmp" "$site_candidate"
  else
    awk '
      /^[[:space:]]*@backend path \/api \/api\/\*$/ && !inserted {
        print "    @hitpay_sandbox_webhook path /api/payments/hitpay-sandbox/webhook"
        print "    handle @hitpay_sandbox_webhook {"
        print "        rewrite * /api/payments/hitpay/webhook"
        print "        reverse_proxy 127.0.0.1:4001"
        print "    }"
        print ""
        inserted=1
      }
      { print }
      END { if (!inserted) exit 42 }
    ' "$site_tmp" > "$site_candidate" || return 1
  fi

  [[ $(grep -Fc '@hitpay_sandbox_webhook path /api/payments/hitpay-sandbox/webhook' "$site_candidate") -eq 1 ]] \
    || return 1
  install -m 0644 "$main_tmp" "$CADDY_FILE"
  install -m 0644 "$site_candidate" "$CADDY_SITE_FILE"

  if ! caddy validate --config "$CADDY_FILE" || ! systemctl reload caddy; then
    cp -p "$main_backup" "$CADDY_FILE"
    cp -p "$site_backup" "$CADDY_SITE_FILE"
    systemctl reload caddy || true
    rm -f "$main_tmp" "$site_tmp" "$site_candidate" "$main_backup" "$site_backup"
    return 1
  fi

  rm -f "$main_tmp" "$site_tmp" "$site_candidate" "$main_backup" "$site_backup"
}

ensure_secrets
install_release
gzip -dc "$RELEASE_DIR/images/backend.tar.gz" | docker load >/dev/null
docker image inspect "online-shopping-backend:$TAG" >/dev/null
[[ $(docker image inspect --format '{{.Architecture}}' "online-shopping-backend:$TAG") == amd64 ]] \
  || die "backend image architecture is not amd64"

export IMAGE_TAG="$TAG"
compose config >/dev/null
compose up --detach --remove-orphans
wait_for_backend || die "sandbox backend did not become healthy"
configure_caddy || die "Caddy configuration failed"

printf '%s\n' "$TAG" > "$CURRENT_TAG_FILE"
chmod 0600 "$CURRENT_TAG_FILE"
log "Ready: $WEBHOOK_URL"
