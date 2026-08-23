# Prompts for the other AIs + how Grok checks them

**Current sitting:** OpenCode full remaining catalogue. Manus retired. Gemini last, after OpenCode complete. See `START-IMAGE-SITTING.md`.

They write **only** into `catalogue/ai-inbox/<model>/`. They do not deploy, do not turn on card pay, do not edit `backend/` or `frontend/` unless their prompt says so.

| Model | Prompt file | Output folder | Status | Grok checks |
|---|---|---|---|---|
| **OpenCode** | `opencode-full-catalogue.md` | `opencode-verify/` + `opencode-recover/` | **re-paste now** — ignore tokens; max quality + parallel speed | livecheck; 100-row `full-shard-*.csv`; coverage 7771 |
| **Gemini** | `gemini-pass-images-only.md` | `gemini-image-reverify/` | **wait** — last pixel pass | `pass-images-only.csv` after OpenCode COMPLETE |
| **OpenCode (closed Job 1–2)** | `opencode-verify-and-recover.md` | same | **done** — do not overwrite `recover-pass1.csv` | — |
| **Manus** | all `manus-*.md` | `manus-images/` | **retired** | do not paste |
| **Gemini (closed)** | `gemini-image-reverify.md` / `gemini-manus-priority-300-reverify.md` | `gemini-image-reverify/` | **done** | do not re-paste |
| **Claude** | `claude-protected-review.md` | `claude-review/` | **done** | — |
| **DeepSeek** | `deepseek-image-verify.md` | `deepseek-image-verify/` | **retired** | — |

Pickup cart is **on**. Card pay stays **off**. Delivery stays **off**.

```
python scripts/check-ai-inbox.py
```

Do not apply images to production. Rights stay `needs_permission`.
