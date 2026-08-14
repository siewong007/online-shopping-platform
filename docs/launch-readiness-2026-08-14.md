# Ekoway launch readiness — 14 August 2026

This record reflects the repository and deployed production state inspected on 14 August 2026. The live store is intentionally fail-closed while the release is prepared: the storefront is reachable, no demo merchandise is published, and the legacy unpaid checkout endpoint is blocked.

## P0 — blocks a real order

- Prepare a clean, reviewed release from the current provider-neutral checkout and catalogue work, then deploy it with production payments still disabled.
- Let the deployment runner apply migrations 0028–0033 and verify the readiness endpoint before exposing checkout.
- Publish the validated Ekoway catalogue. The local import contains 7,771 in-stock source products across 40 categories; keep the 124 items below 20% gross margin unpublished until the owner approves a margin rule, and do not restore the eight removed demo products.
- Complete HitPay Malaysia business verification, obtain production-only credentials, activate the approved production methods, configure a production webhook salt, and perform one controlled live payment/refund. This is a human/external blocker and must not reuse sandbox credentials.
- Remove the temporary Caddy guard on `POST /api/checkout` only in the same controlled release that exposes the secure `/api/checkout/payment` flow.

## P1 — should complete before public launch

- Connect and test transactional order/payment/refund email. Until then, use an explicit manual confirmation procedure through the store phone/WhatsApp and do not promise automatic email.
- Confirm owner-controlled policy facts: SST applicability, business/opening hours, cancellation cutoff, return eligibility/exclusions, return window, refund-processing target, and who pays return delivery.
- Review the 124 catalogue items below 20% gross margin after gateway fees and operating costs; approve a minimum-margin rule before publishing them.
- Review customer-facing product names (currently close to AutoCount descriptions), the 228 products in `other`, and category placement. Preserve source item codes internally.
- Keep launch pickup-only. Correct shipping classes and add approved rates/couriers before enabling delivery.
- Add admin login throttling and finish the planned production session hardening/MFA work.
- Add an automated off-instance backup and prove a restore. Current pre-deploy backups are local to the server only.
- Add actionable health/log alerts. Structured logs and readiness checks exist, but there is no external alert recipient.
- Re-run mobile checkout and purchase-blocking accessibility checks against the release candidate with the real catalogue.

## P2 — safe after launch

- Complete product-image coverage and image merchandising.
- Add richer product SEO, catalogue sitemap coverage, and nonessential analytics.
- Add additional e-wallet/BNPL methods only after the core production payment flow is stable and commercially justified.
- Replace manual operational notifications and reconciliation reports with deeper automation.

## Deferred / non-blocking

- Before the next GitHub-based sandbox redeployment, update the `hitpay-sandbox` environment secret `HITPAY_SANDBOX_WEBHOOK_SALT` with the endpoint-specific salt currently used by the working sandbox service.

## Completed and not to repeat

- HitPay sandbox E2E, signed-webhook capture, invalid-signature rejection, duplicate idempotency, safe browser return, and sandbox refund are proven.
- Sandbox traffic is isolated on the exact public webhook route and internal service on port 4001; production remains on port 4000.
- Production schema drift was repaired and a checksum-backed migration ledger was baselined through migration 0027.
- Deployment now applies pending migrations on existing databases before application rollout.
- The readiness endpoint now checks critical schema instead of returning a static success response.
- A pre-change database backup exists, the fake public demo content was removed, and legacy unpaid order creation is blocked at the proxy.
- Unconfirmed trading history, opening hours, fixed return/refund windows, follower counts, and brand/warranty guarantees were removed from the release-candidate copy; a regression test prevents those claims from returning accidentally.
- Production HitPay configuration has not been enabled or modified.
