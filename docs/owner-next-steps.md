# What you do next — Ekoway owner guide

Updated 22 August 2026. **Manus is retired** for images. OpenCode researches and self-verifies the remaining catalogue; Gemini is the last visual pass after OpenCode completes. Prompts: `docs/ai-prompts/START-IMAGE-SITTING.md`.

Pickup shopping is **on** (listed prices). **Card payment is postponed.** Delivery is **off**. Image-permission emails: you said you don’t care — Manus still finds photos; we still will not pretend a brand granted rights.

**0.8 prices:** AutoCount Price 1 is on the live shop for **7,035** matching SKUs. **No 20% margin rule. Cost is not stored.** Full note: `docs/0.8-price-update-2026-08-20.md`.

---

## Today: new image sitting (optional, if you want more photos found)

Closed sitting already banked **85** dual-agreed candidates (still `needs_permission`, **not** published). Do **not** re-paste the old prompts.

To raise the verified-image rate: **Manus is retired.** Paste **OpenCode** `docs/ai-prompts/opencode-full-catalogue.md` (same chat). Gemini last visual pass only after OpenCode says `OPENCODE FULL CATALOGUE COMPLETE`. Gemini must not see pending rows.

Do **not** publish product photos. Rights stay `needs_permission`.

Next useful shop step (only if you want it): tell Grok `Put WhatsApp pickup on the live site`. That deploy still needs migration `0036` first and a fresh `frontend` build. Card pay stays off.

### 2. Backup contacts (you already gave these)

We recorded:

- Drive / alert email: **siewwong007@gmail.com**
- Alert mobile: **011-1603 1656**

Off-site Drive backup is **postponed** (owner, 20 Aug 2026). age key + `backup.env` are already on the VPS when you want to finish it later. Do not paste Drive passwords into chat.

### 3. Try pickup locally (optional)

On this PC, with Docker already started:

```
cd online-shopping-platform
docker compose up -d db
cd frontend
bun install
bun run dev
```

Open http://localhost:5173/shop  

You should see **Add to cart**. Checkout should **open WhatsApp** with the pickup list, **not** HitPay. Delivery must not appear.

The **live** site (ekowayhardware.com) now has **Add to cart** and **Send pickup list on WhatsApp**. Card pay is still off. We have **not** lifted the Caddy unpaid-checkout guard.

---

## This week, in order

| Step | Who | You do | Done when |
|---|---|---|---|
| A | You | OpenCode full remaining catalogue (parallel research+verify); Gemini last | `OPENCODE FULL CATALOGUE COMPLETE`; still not published |
| B | Grok | WhatsApp pickup on live `/shop` (20 Aug 2026). Card pay still off. Caddy `POST /api/checkout` still 503 | Live checkout button opens WhatsApp **017-405 6993** with the pickup list |
| C | Grok | Live prices = Excel Price 1 by item code (**7,645** rows). Old coil/dozen/roll prices removed. | Shop shows AutoCount Price 1 only |
| D | You | HitPay: **later**. Do not send sandbox keys. When ready: production keys + **endpoint** webhook salt | Then we schedule one RM 3–10 live pickup test |
| E | — | Off-site Drive backup | **postponed** |

Do **not** ask anyone to:

- Lift the Caddy `POST /api/checkout` guard (that would allow unpaid website orders)
- Turn on `VITE_ENABLE_CARD_PAY` or `PAYMENT_ACTIVATION_MODE=public` before D
- Publish Manus photos to the live product grid (0.2 skipped ≠ legal to host brand files)
- Enable delivery

---

## What each status means for customers

| Action | Now |
|---|---|
| Browse real stock | Yes (live site already has ~7,647 products) |
| See listed prices | Yes (catalogue `price_myr`) |
| Add to cart / pickup list | **Yes** on live `/shop` — WhatsApp **017-405 6993**, not HitPay |
| Pay by card / FPX | **No** (HitPay postponed) |
| Finish a pickup | WhatsApp **017-405 6993** with the cart list |
| Delivery | **No** |
| Product photos on SKUs | Honest missing-image until a later import of verified files |

---

## When you come back to Grok, say one of these

- `Finish off-site backup` when you want Drive copies again
- `HitPay production keys are ready` (do not paste keys in the same message; say they are ready)
- AutoCount desktop push is **built**. Shop PC: `docs/autocount/stock-price-push.md`. Website token + backend deploy still required before uploads work.

Grok will check the other AIs’ files and tell you the next single action. Do not wait for every image before using WhatsApp pickup — photos can arrive in the background.
