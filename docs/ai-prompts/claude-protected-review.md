# Prompt — Claude — protected-flow review (start now)

**Done 19 August 2026** (`catalogue/ai-inbox/claude-review/20260819.md`). Do not paste this again unless Grok asks for a new review.

Historical prompt below. DeepSeek is retired.

Copy everything below the line into Claude. Read-only.

---

Review uncommitted Ekoway Hardware at `online-shopping-platform/` on branch `joseph`. **Read-only.** Do not deploy, push, or edit unless you find a security hole you can patch in-place (login throttle / pickup lock only).

**Confirm these facts (quote file + line):**

1. Caddy still 503s `POST /api/checkout` (`deploy/ekowayhardware.Caddyfile`).
2. `PAYMENT_ACTIVATION_MODE` unset → payments disabled.
3. `VITE_ENABLE_CARD_PAY` is not `true` (card/FPX off). Pickup cart may be on (`PURCHASE_ENABLED` defaults on; WhatsApp checkout if card pay off).
4. Public quote/checkout rejects `delivery` unless `PUBLIC_DELIVERY_ENABLED=true`.
5. Admin login 429 after 5 failures / 15 min (`0036_admin_login_throttle.sql`).
6. No 1001–2500 regenerate; no product images published.

**Out of scope:** HitPay production, Caddy lift, delivery, image import, 3a Job Band.

**Write** `online-shopping-platform/catalogue/ai-inbox/claude-review/YYYYMMDD.md`:

- Findings (severity, path, why)
- Table: each of the 6 facts → pass/fail
- Missing tests

Say `CLAUDE REVIEW COMPLETE`.
