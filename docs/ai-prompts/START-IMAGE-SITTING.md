# Image sitting — 22 August 2026

**Manus is retired.** OpenCode researches and self-verifies **all remaining SKUs**. Gemini is the **last** visual pass, only after OpenCode says complete.

| Who | Role | Paste | When |
|---|---|---|---|
| **OpenCode** | Research + verify remaining catalogue. **Ignore token cost. Max quality + max parallel speed.** | `opencode-full-catalogue.md` | **now** (re-paste into the same chat) |
| **Gemini** | Last pixel review of OpenCode `candidate` rows only | `gemini-pass-images-only.md` | **wait** for `OPENCODE FULL CATALOGUE COMPLETE` |
| **Manus** | — | nothing | **retired** |

**Do not paste:** any `manus-*.md`, `opencode-remaining-catalogue.md`, `opencode-verify-and-recover.md`, `gemini-image-reverify.md`, `deepseek-image-verify.md`.

## Pipeline

```
OpenCode (parallel search + self-verify) on remaining-all-worklist.csv
        │
        ├─ candidate (exact official image) ──► held until FULL COMPLETE
        └─ pending / reject (queries recorded) ──► never sent to Gemini

When coverage = 7,771/7,771 ──► Grok builds pass-queue-final.csv ──► Gemini last verify
```

Worklist: `catalogue/ai-inbox/opencode-recover/remaining-all-worklist.csv`

- 213 already-pass (live-check only)
- 5,193 never searched
- 2,305 previously failed (reopen only if a new official URL exists)
- 60 duplicate listings

## Locked

- Forensic 1–2500 + zip SHA `b90ce77adf6f9a849df22161540d8ca363af4db5fec0c48b1838eab715955f9d`
- `recover-pass1.csv` (do not overwrite)
- Dual-agreed / OpenCode pass keys are `skip_pass` unless the URL is dead

## Hard rules

Pickup on. Card pay off. Delivery off. No deploy. No `frontend/public/product-images/`. No rights approved.

OpenCode: token cost does not matter. Re-paste `opencode-full-catalogue.md` if an older copy is already in the chat (100-row shards, 25-SKU waves, 6 searches per SKU in one turn, 4 parallel workers if available).

Tell Grok each `OPENCODE FULL SHARD COMPLETE` / `OPENCODE FULL CATALOGUE COMPLETE`.
