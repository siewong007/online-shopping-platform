# Stable HitPay sandbox deployment

## Boundary

The sandbox payment backend is isolated from the production storefront:

- existing HTTPS host: `ekowayhardware.com`;
- exact public route: `/api/payments/hitpay-sandbox/webhook`;
- backend loopback port: `127.0.0.1:4001`;
- separate PostgreSQL container, database, volume and Docker networks;
- sandbox HitPay credentials only;
- no public sandbox catalogue, cart, checkout, admin, health or reconciliation route;
- Caddy rewrites the exact public path to `/api/payments/hitpay/webhook` only after selecting the
  loopback-only sandbox backend;
- browser return target: `https://ekowayhardware.com/shop?payment_return=hitpay`;
- allowed browser origin: `https://ekowayhardware.com` (origins do not contain paths).

The stable webhook URL is:

`https://ekowayhardware.com/api/payments/hitpay-sandbox/webhook`

An SSH-only GitHub workflow creates the MYR 3.20 pickup UAT checkout in the same isolated
database that receives its webhook. The hosted checkout URL is the only result exposed to the
operator. HitPay returns the browser to the real Ekoway `/shop` route, where React displays only
payment-processing information; the return URL cannot capture a payment.

## One-time owner setup

1. In the HitPay sandbox dashboard, register the stable webhook URL for:

   - `payment_request.completed`;
   - `payment_request.failed`.

   HitPay generates a salt for this individual webhook endpoint. Use that endpoint salt for
   webhook verification; the salt shown beside the account API key is not interchangeable.
   Do not change any production webhook registration.

2. In the GitHub repository, open **Settings → Environments**, create `hitpay-sandbox`, and add:

   - `LIGHTSAIL_SSH_PRIVATE_KEY` — the existing private key authorized for
     `ubuntu@13.251.162.88`;
   - `HITPAY_SANDBOX_API_KEY`;
   - `HITPAY_SANDBOX_WEBHOOK_SALT` — the salt generated for the exact webhook endpoint above.

   Do not copy either sandbox value into a production environment or a frontend variable.

3. Merge the reviewed files to `main`, then run **Deploy HitPay sandbox** from GitHub Actions.
   Success means the storefront and production health endpoint remain HTTP 200, the exact
   sandbox webhook returns HTTP 405 to GET, and an unsigned POST returns HTTP 401.

   To keep sandbox preparation completely separate from production deployment, the same workflow
   may instead run from the dedicated `hitpay-sandbox-deployment` branch. Production CI/deploy is
   not triggered by that branch.

No DNS record, new subdomain or additional public service is required.

## Controlled E2E sequence

1. Run **HitPay sandbox UAT operation** with `create-checkout`.
2. Start at `https://ekowayhardware.com/shop`, open the emitted official HitPay sandbox
   `payment_url`, and complete one official sandbox payment method. Do not call reconciliation.
3. Run the workflow with `status`. The new `EKW-*` row must show `payment=Captured`; the event
   count must show one effective gateway event and stock must not be released.
4. Confirm the provider webhook delivery shows HTTP 200 in HitPay.
5. Run `refund-latest-captured` once. The helper performs one full refund and one identical retry;
   it succeeds only if the first is `Succeeded` and the retry is reported as a duplicate.
6. Run `cancel-unpaid` after testing to cancel abandoned Pending/Failed sandbox orders through
   the audited admin API. Captured/refunded orders and gateway evidence are preserved.

The checkout and admin APIs remain unreachable from the Internet throughout this procedure.

## Production activation remains disabled

Production support requires all of the following before changing `PAYMENT_PRIMARY_PROVIDER` or
`HITPAY_MODE`:

- completed HitPay production KYB/merchant approval and settlement bank setup;
- written confirmation of Ekoway's approved methods, limits, fees and settlement schedule;
- production API key and webhook endpoint salt stored only in the production backend environment;
- production webhook registration at
  `https://ekowayhardware.com/api/payments/hitpay/webhook`;
- one reviewed deployment plan and explicit authorization for a controlled real-money purchase;
- post-purchase capture, inventory, reconciliation and refund verification.

Official references: [API overview](https://docs.hitpayapp.com/apis/overview),
[online payment flow](https://docs.hitpayapp.com/apis/guide/online-payments),
[payment-request API](https://docs.hitpayapp.com/apis/payment-request/create-request), and
[refund policy](https://docs.hitpayapp.com/payments/refund).
