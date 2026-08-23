# Ekoway Hardware payment-gateway decision

**Decision date:** 11 August 2026  
**Status:** Evidence-backed recommendation; no production-provider switch authorised yet.

## Recommendation

Use **HitPay as the primary gateway candidate**. It has the best overall fit for a Malaysian hardware store: strong cards, FPX, DuitNow QR, local wallets and BNPL coverage; no setup or monthly fee; a modern server-to-server API; HMAC-SHA256 JSON webhooks; API refunds; separate sandbox and production environments; and a useful reconciliation ledger.

Keep **Billplz as the cost challenger and potential future FPX route**. Its flat RM1.10 Basic-plan FPX fee is materially cheaper than percentage pricing on high-value orders, its callback retry policy is explicit, and its API versions are maintained. It is not the first choice because card/e-wallet activation requires extra partner approval and FPX refunds require a separate disbursement using customer bank details.

Keep the existing **senangPay adapter dormant but intact**. It remains a credible fallback and has unusually broad BNPL/IPP coverage, but its percentage fees are less attractive for high order values, approval can take up to 14 business days, the required merchant-document set is heavy, and its documentation spans legacy senangPay and the newer DOKU platform.

Do **not** run two production gateways at launch. Add Billplz later only if three months of payment data shows at least RM20,000 monthly FPX volume, or if a primary-gateway outage/missing method is causing measurable lost orders. At RM20,000 of FPX volume over 40 RM500 orders, published standard rates imply roughly RM376 through HitPay versus RM44 through Billplz Basic—a potential RM332 monthly saving before tax and any negotiated terms.

## Fit comparison

| Provider | Ekoway fit | Main strength | Material weakness | Decision |
|---|---:|---|---|---|
| HitPay | A | Broad Malaysian methods, low domestic-card rate, strong REST/webhook/refund workflow, no fixed fee | FPX is percentage-priced and the official sandbox list does not include FPX | Primary candidate; complete merchant approval and sandbox pilot |
| Billplz | A- | Flat high-value FPX economics, explicit callback retries, versioned API, fast FPX settlement | FPX refunds are disbursements requiring payer bank details; cards/wallets need extra KYB | Future high-value FPX route or fallback |
| Razorpay Curlec | A- | Mature payment lifecycle, capture, partial refunds, webhooks, T+2 settlement and reconciliation APIs | DuitNow Pay is early access; pricing page contains inconsistent setup-fee copy | Reconsider if DuitNow becomes generally available or enterprise quote is strong |
| senangPay-DOKU | B+ | FPX, cards, wallets, BNPL and bank IPP in one local platform; implementation already exists | High-AOV percentage fees, full-only Refund API, long/document-heavy approval, platform transition | Preserve adapter; do not default to it merely because code exists |
| Stripe | B for Ekoway / A technically | Best-in-class API, security, refunds, webhook retries and reconciliation | MY pricing is expensive and current Malaysia docs lack DuitNow QR, TNG and ShopeePay | Not primary; useful only for future international expansion |
| ToyyibPay | C+ | Very low FPX/card pricing and DuitNow QR | Narrower method set, PHP/form-oriented API, MD5 callback verification, unclear automated-refund path | Do not use as the core production gateway |

The grades are specific to Ekoway, not general rankings. They prioritise Malaysian payment coverage and high-AOV economics over international reach.

## Published standard pricing

| Provider | FPX / bank | Domestic cards | DuitNow / wallets | BNPL / IPP | Fixed fee |
|---|---|---|---|---|---|
| HitPay | 1.8% + RM0.40 | 1.2% + RM1 | DuitNow 1.2%; GrabPay 2%; TNG 1.9%; ShopeePay 2.2% | Offered; method activation varies | None |
| Billplz Basic | RM1.10 | 1.8% | Wallet rates generally 1.0%–1.4%; partner approval required | Grab PayLater 6.5%; Atome 6.3% | RM0 |
| Billplz Standard | RM0.70 | 1.5% | Same published wallet rates | Same published BNPL rates | RM999/year + SST |
| senangPay Advance | RM1 or 1.5%, higher amount | RM0.65 or 2.5%, higher amount | RM0.65 or 1.5%, higher amount | SPayLater 2%; Grab 6%; Atome 5.5%; bank IPP add-on | RM349/year; current promotion shown separately |
| ToyyibPay Standard | RM1 B2C / RM2 B2B | 1.5% local; 3.5% foreign | DuitNow QR 1% or RM1 | Not established in current pricing/API docs | Cards: RM100 onboarding + RM100/year after year one |
| Razorpay Curlec Basic | 1.5% or RM1, higher amount | 2.4% | TNG/Boost/GrabPay 1.5% | Atome 6% | Pricing table says RM0 setup; FAQ lower on same page says RM99—obtain written quote |
| Razorpay Curlec Premium | 1% or RM1, higher amount | 2% | TNG/Boost 1.3%; GrabPay 1.5% | Atome 5% | RM999 one-time |
| Stripe | 3% + RM1 | 3% + RM1 domestic; +1% international | GrabPay 3%; no DuitNow/TNG/ShopeePay in current MY method docs | No useful Malaysian BNPL coverage established | None |

All rates are public standard rates, not an approved Ekoway merchant quotation. Tax, reserves, chargebacks, refund treatment, method-specific approval and negotiated pricing can change the effective cost.

### High-value transaction examples

| Provider/method | RM100 order | RM500 order | RM2,000 order |
|---|---:|---:|---:|
| HitPay FPX | RM2.20 | RM9.40 | RM36.40 |
| Billplz Basic FPX | RM1.10 | RM1.10 | RM1.10 |
| senangPay FPX | RM1.50 | RM7.50 | RM30.00 |
| ToyyibPay FPX B2C | RM1.00 | RM1.00 | RM1.00 |
| Curlec Basic FPX | RM1.50 | RM7.50 | RM30.00 |
| Stripe FPX | RM4.00 | RM16.00 | RM61.00 |
| HitPay domestic card | RM2.20 | RM7.00 | RM25.00 |
| Billplz Basic domestic card | RM1.80 | RM9.00 | RM36.00 |

## Operational comparison

| Area | HitPay | Billplz | senangPay | ToyyibPay | Curlec | Stripe |
|---|---|---|---|---|---|---|
| Local methods | FPX, DuitNow, cards, TNG, GrabPay, ShopeePay and others | FPX, cards, DuitNow/e-wallets, BNPL via partners | FPX, cards, major wallets, BNPL, IPP | FPX, cards, DuitNow QR | FPX, cards, TNG, Boost, GrabPay, Atome; DuitNow limited/early access | Cards, FPX, GrabPay, Alipay; limited MY-local coverage |
| Refunds | API support; no extra refund processing fee, original fee retained | FPX is a Payment Order/disbursement and needs customer bank details | Refund API for cards; current API example rejects partial refunds; up to 180 days | No clear public automated-refund API found | Full and partial Refund APIs and refund webhooks | Full/partial API, strong lifecycle; original fees generally retained |
| Settlement | Non-card T+2 business days; cards from T+3, compliance-dependent | FPX next business day; e-wallet next calendar day; cards T+2 business days | As early as next working day; schedule varies by method/package | FPX 1–4 business days; DuitNow 2; cards 4 | Standard T+2 working days, subject to bank/risk approval | First payout 7–14 days; later timing depends on market/method and dashboard schedule |
| Reconciliation | Unified transaction ledger and export; references in webhook | Dashboard exports; transaction APIs; enterprise reconciliation service | Dashboard reports, transaction list/query APIs | Real-time reports and transaction query | Settlement IDs/UTRs, reports and settlement reconciliation API | Best-in-class immutable balance transactions and payout reconciliation reports |
| Sandbox | Separate account, request logs and realistic webhooks; FPX not listed as testable | Dedicated sandbox with dummy bank and signed callbacks | Free sandbox; legacy/new-platform transition must be checked | Separate dev account and bank simulators | Test API keys and mock success/failure bank page | Excellent sandboxes, test clocks/data, CLI/event replay |
| Webhook design | Raw-JSON HMAC-SHA256; event types | HMAC-SHA256 X-Signature; five documented attempts through ~24 hours | HMAC-SHA256 callback and status-query APIs; no equivalent retry policy found | Secret-prefixed MD5 callback hash | Secret-signed webhooks, failure alerts and replay support | Timestamped signatures, replay protection and retries for up to 3 days |
| Merchant approval | SSM profile, ID/selfie and matching bank; published guidance says 1–3 business days | SSM/registration, matching bank, TIN; bank verification ~3 days; extra card/wallet KYB | SSM/Sarawak licence, IDs, three bank statements, premises/inventory photos, complete website policies; agreement allows up to 14 business days | SSM or supported individual/DEGM route, ID and bank information; Shariah-compliant activities | Full activation and bank approval required; obtain exact Malaysian checklist in writing | Online activation and risk review; extra documents can be requested |

“Reliability” here means documented integration controls—not independently measured uptime. None of the reviewed public official documents provides enough comparable gateway-level success-rate or webhook-delivery SLA data to rank production uptime honestly.

## Provider-independent architecture now in the repository

The store has one public checkout contract:

`POST /api/checkout/payment -> { order, payment_url, provider }`

The Rust payment module now has a `PaymentGateway` boundary. Each adapter owns:

- provider configuration and credentials;
- hosted checkout/session creation;
- provider order-reference format;
- signature verification and provider event parsing.

The shared ledger owns:

- order creation and cleanup if gateway initiation fails;
- provider-namespaced idempotency keys such as `hitpay:...` or `senangpay:...`;
- normalised Pending, Captured and Failed transitions;
- the paid state used by fulfilment and sales;
- the provider-neutral React redirect response.

The existing senangPay code is the first adapter. `PAYMENT_PRIMARY_PROVIDER` is deliberately blank by default. Existing senangPay credentials continue to work through backward-compatible detection, but selecting `hitpay`, `billplz`, `curlec`, `toyyibpay` or `stripe` fails closed until that adapter passes sandbox tests. This prevents a configuration-only production switch to untested code.

## Production selection gate

Before changing the live gateway:

1. Apply to HitPay and Billplz in parallel using the same real business details.
2. Ask both providers to confirm in writing:
   - approval for hardware retail and the expected maximum order value;
   - daily/monthly transaction or collection limits;
   - exact enabled methods at launch;
   - effective fees including SST, reserves and chargebacks;
   - settlement schedule for each method;
   - partial/full refund support for FPX, DuitNow, cards and wallets;
   - whether production webhooks can be replayed and how delivery failures are alerted.
3. Build the HitPay adapter only after sandbox credentials are available.
4. Test success, failure, abandonment, duplicate webhook, out-of-order webhook, refund, delayed callback and reconciliation export.
5. Run one small live purchase and refund before opening checkout to customers.
6. If HitPay’s approved limits, refund handling or effective rates are materially worse than documented, select Billplz instead. The store contract and ledger do not need to change.

## Official sources

- HitPay: https://hitpayapp.com/my/pricing, https://docs.hitpayapp.com/apis/guide/online-payments, https://docs.hitpayapp.com/apis/guide/sandbox, https://docs.hitpayapp.com/onboarding/requirements-my, https://docs.hitpayapp.com/payment-methods/fpx
- Billplz: https://www.billplz.com/pricing.html, https://support.billplz.com/api, https://support.billplz.com/guide/issue-a-refund, https://support.billplz.com/guide/settlement-schedule-by-payment-method, https://support.billplz.com/guide/understanding-identity-verification-kyc-and-kyb
- senangPay-DOKU: https://senangpay.com/pricing/, https://guide.senangpay.com/direct-api, https://guide.senangpay.com/refund-api, https://guide.senangpay.com/required-documents-to-register, https://guide.senangpay.com/user-merchants-agreement-for-senangpay-services
- ToyyibPay: https://www.toyyibpay.com/pricing-plans/, https://toyyibpay.com/apireference/, https://www.toyyibpay.com/risk-management/
- Razorpay Curlec: https://curlec.com/pricing/, https://curlec.com/docs/payments/payments/faqs/, https://curlec.com/docs/payments/settlements/, https://curlec.com/docs/api/refunds/, https://curlec.com/docs/webhooks/faqs/, https://razorpay.com/docs/payments/payment-methods/duitnow-pay/
- Stripe: https://stripe.com/en-my/pricing, https://docs.stripe.com/payments/payment-methods/payment-method-support, https://docs.stripe.com/webhooks, https://docs.stripe.com/refunds, https://docs.stripe.com/plan-integration/get-started/reporting-reconciliation
