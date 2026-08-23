# senangPay launch setup

> **Contingency status (11 August 2026):** senangPay is no longer assumed to be the production
> gateway. Preserve this guide and adapter while HitPay and Billplz merchant terms are verified.
> Do not buy a plan or switch production solely because this integration already exists. See
> `payment-gateway-decision-2026-08-11.md` for the current decision gate.

The storefront is wired for **senangPay Advance**, not the Starter plan. The custom payment API is required by this code, and senangPay lists API integration for its Advance and Enterprise plans.

## What the owner must do

1. Apply for a senangPay **Advance** merchant account using the real Ekoway business details and settlement bank account. Complete every verification item requested in the merchant dashboard. Do not put the store live while the account is still pending.
2. In senangPay, obtain the Merchant ID and Secret Key. Keep the secret private; never place it in frontend files, Git, screenshots, or chat.
3. Set the gateway callback URL to:

   `https://ekowayhardware.com/api/payments/senangpay/callback`

   If the API is served from another public domain, use that public HTTPS API domain instead. It must be reachable by senangPay without a login or VPN.
4. Configure the gateway return URL to:

   `https://ekowayhardware.com/shop?payment=return`

   The return screen deliberately says that payment is being verified. The server callback, not the browser return, marks an order as paid.
5. In the live backend environment, add these secrets (not to this repository):

   ```env
   SENANGPAY_MERCHANT_ID=your_merchant_id
   SENANGPAY_SECRET_KEY=your_secret_key
   SENANGPAY_MODE=sandbox
   ```

6. Use sandbox mode first. Make one real end-to-end sandbox payment and confirm all three things:

   - senangPay reaches the callback and receives `OK`;
   - the order's payment becomes `Captured` in OPT Console > Payments;
   - the related sales record shows payment status `paid`.

7. Only after that test passes, switch exactly one setting to `SENANGPAY_MODE=live`, deploy, and make a small live purchase yourself. Refund it only through the gateway/admin process after confirming the payment record is correct.
8. In OPT Console > Settings, set `inventory.unpaid_release_minutes` to **30** once live payment is active. This releases stock held by abandoned or failed payment attempts after 30 minutes.

## Important operational facts

- The production Docker configuration sets `APP_ENV=production`; this disables the old unpaid `/api/checkout` endpoint. Storefront checkout uses `/api/checkout/payment` and redirects to senangPay.
- With no senangPay credentials, the storefront rejects payment attempts before it creates an order. This is intentional: it prevents unpaid, unfulfillable orders.
- This integration sends the required signed fields to senangPay and verifies the signed server callback before it marks payment as paid. Do not manually change a payment to paid merely because a customer sends a receipt image.
- Transactional email is not yet connected. Do not promise email confirmations in storefront copy until an email sender has been configured and tested.

## Current commercial reference

Check senangPay's current pricing immediately before purchase. At the time this integration was prepared, senangPay listed Advance at RM349/year, with a RM299 promotional price shown, and listed processing fees separately by payment method. Pricing and approval requirements can change.

Official references:

- https://senangpay.com/pricing/
- https://senangpay.com/faq/
- https://guide.senangpay.com/manual-integration-api
- https://guide.senangpay.com/direct-api

## Local verification command

When Docker Desktop is running and the local `online-shopping-db` container is healthy, run this from `backend`:

```powershell
$env:Path = 'C:\msys64\mingw64\bin;' + $env:Path
$env:DATABASE_URL = 'postgres://project_depot:project_depot@localhost:5433/project_depot'
cargo test
```
