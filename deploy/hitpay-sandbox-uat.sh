#!/usr/bin/env bash
# Controlled, SSH-only UAT operations against the isolated sandbox backend.
set -Eeuo pipefail
umask 077

readonly APP_DIR=/opt/online-shopping-hitpay-sandbox
readonly SECRETS_FILE="$APP_DIR/secrets.env"
readonly API=http://127.0.0.1:4001
readonly COMPOSE_FILE="$APP_DIR/docker-compose.hitpay-sandbox.yml"
ACTION="${1:-status}"

die() { printf '[hitpay-sandbox-uat] ERROR: %s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "run this script as root"
[[ -f "$SECRETS_FILE" ]] || die "sandbox secrets are missing"
# shellcheck disable=SC1090
source "$SECRETS_FILE"
export SANDBOX_POSTGRES_PASSWORD SANDBOX_ADMIN_SEED_PASSWORD
export HITPAY_SANDBOX_API_KEY HITPAY_SANDBOX_WEBHOOK_SALT
export IMAGE_TAG="$(<"$APP_DIR/current-tag")"

compose() {
  docker compose --project-name online-shopping-hitpay-sandbox --file "$COMPOSE_FILE" "$@"
}

sql() {
  compose exec -T postgres psql -v ON_ERROR_STOP=1 -At \
    -U hitpay_sandbox -d hitpay_sandbox -c "$1"
}

json_value() {
  local key=$1
  sed -n "s/.*\"$key\":\"\([^\"]*\)\".*/\1/p" | head -n 1
}

admin_token() {
  local login token
  login=$(curl -fsS -H 'Content-Type: application/json' \
    --data "{\"username\":\"admin\",\"password\":\"$SANDBOX_ADMIN_SEED_PASSWORD\"}" \
    "$API/api/admin/login")
  token=$(printf '%s' "$login" | json_value token)
  [[ -n "$token" ]] || die "could not obtain sandbox admin session"
  printf '%s' "$token"
}

case "$ACTION" in
  create-checkout)
    product_id=$(sql "SELECT id FROM products WHERE source_item_code='SANDBOX-HITPAY-UAT' AND source_uom='EA' LIMIT 1")
    [[ "$product_id" =~ ^[0-9]+$ ]] || die "sandbox UAT item is missing"
    response=$(curl -fsS -H 'Content-Type: application/json' \
      --data "{\"customer_name\":\"Ekoway Sandbox UAT\",\"customer_email\":\"ekowayhardware+hitpay-sandbox@gmail.com\",\"customer_phone\":\"084253883\",\"fulfillment_method\":\"pickup\",\"items\":[{\"product_id\":$product_id,\"quantity\":1}]}" \
      "$API/api/checkout/payment")
    order_id=$(printf '%s' "$response" | sed -n 's/.*\"order\":{\"id\":\([0-9][0-9]*\).*/\1/p' | head -n 1)
    payment_url=$(printf '%s' "$response" | json_value payment_url)
    [[ "$order_id" =~ ^[0-9]+$ && "$payment_url" == https://* ]] || die "checkout response was invalid"

    token=$(admin_token)
    curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
      --data '{"channel":"sandbox","sales_rep":"UAT","discount_cents":0}' \
      -X PUT "$API/api/admin/sales/$order_id" >/dev/null
    printf 'order_reference=EKW-%s\npayment_url=%s\n' "$order_id" "$payment_url"
    ;;
  status)
    sql "SELECT 'EKW-'||o.id||'|fulfillment='||o.fulfillment_status||'|stock_released='||COALESCE((o.stock_released_at IS NOT NULL)::text,'false')||'|payment='||p.status||'|refunded_cents='||p.amount_refunded_cents||'|events='||(SELECT count(*) FROM payment_gateway_events e WHERE e.payment_id=p.id) FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.provider='hitpay' ORDER BY o.id DESC LIMIT 10"
    ;;
  refund-latest-captured)
    payment_id=$(sql "SELECT id FROM payments WHERE provider='hitpay' AND status='Captured' AND amount_refunded_cents=0 ORDER BY id DESC LIMIT 1")
    [[ "$payment_id" =~ ^[0-9]+$ ]] || die "no captured, unrefunded HitPay sandbox payment exists"
    token=$(admin_token)
    idempotency_key="sandbox-confirmation-refund-payment-$payment_id"
    body="{\"amount_cents\":null,\"idempotency_key\":\"$idempotency_key\"}"
    first=$(curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
      --data "$body" "$API/api/admin/payments/$payment_id/refund")
    second=$(curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
      --data "$body" "$API/api/admin/payments/$payment_id/refund")
    first_status=$(printf '%s' "$first" | json_value status)
    second_duplicate=$(printf '%s' "$second" | sed -n 's/.*\"duplicate\":\(true\|false\).*/\1/p' | head -n 1)
    [[ "$first_status" == "Succeeded" && "$second_duplicate" == "true" ]] \
      || die "refund or duplicate-refund confirmation failed"
    printf 'payment_id=%s\nfirst_status=%s\nduplicate_retry=%s\n' \
      "$payment_id" "$first_status" "$second_duplicate"
    ;;
  cancel-unpaid)
    token=$(admin_token)
    mapfile -t order_ids < <(sql "SELECT o.id FROM orders o JOIN payments p ON p.order_id=o.id WHERE p.provider='hitpay' AND p.status IN ('Pending','Failed') AND o.fulfillment_status='received' ORDER BY o.id")
    for order_id in "${order_ids[@]}"; do
      [[ "$order_id" =~ ^[0-9]+$ ]] || continue
      curl -fsS -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
        --data '{"to_status":"canceled","note":"Sandbox UAT cleanup"}' \
        -X PUT "$API/api/admin/orders/$order_id/fulfillment" >/dev/null
      printf 'canceled=EKW-%s\n' "$order_id"
    done
    ;;
  *) die "unknown action: $ACTION" ;;
esac
