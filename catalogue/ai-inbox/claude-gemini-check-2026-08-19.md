# Claude + Gemini completion check — 19 August 2026

## Claude — **done. Stop. No further Claude action.**

File: `claude-review/20260819.md`. All six prompt facts answered. Did not deploy or edit.

Takeaways for **Grok later** (not for Claude, not for you today):

- **Do not deploy this backend until migration `0036` is applied** — login would 500 if the throttle table is missing (F1).
- Rebuild `frontend` before any deploy — current `dist/` is old and still has “Place Order”.
- Card pay and Caddy unpaid-checkout stay closed. Pickup WhatsApp path is in source, not in the old bundle.

Claude can close.

## Gemini — **done for 1–2500. Stop. Do not wait for DeepSeek.**

DeepSeek is **retired** (19 August 2026). Manus now owns priority-300. Send Gemini a second job **only after** `catalogue/ai-inbox/manus-images/priority-300-pass1.csv` exists.

File: `gemini-image-reverify/existing-1-2500-pass2.csv` — **2,500 unique rows**, header matches the parallel prompt.

| | Count |
|---|---:|
| `gemini_decision=candidate` | 82 |
| `gemini_decision=pending` | 2,418 |
| `agree=yes` | 2,479 |
| `agree=no` (all have a reason) | 21 |
| `rights_status=needs_permission` | 2,500 |
| Invented approvals | 0 |

The 21 disagreements are real quality: white photo on a black fan, dealer URL, Bosch accessory vs whole tool, sibling SKU, dead Dongcheng/Saniware pages. **Do not publish those 21.** The 82 candidates still need owner rights before import.

If Manus later drops `manus-images/priority-300-pass1.csv`, send Gemini **only** a reverify of that one file. Until then Gemini can idle.

## Still running — one chat

| Model | Inbox | Status |
|---|---|---|
| DeepSeek | `deepseek-image-verify/` | **retired** — close the chat |
| Manus | `manus-images/` | **next:** paste `docs/ai-prompts/manus-priority-300.md` |
| Gemini | `gemini-image-reverify/` | **idle** |
| Claude | `claude-review/` | **done** |

Paste Manus the new prompt, then tell Grok `Manus priority-300 shard done` when the first 50-row shard lands.
