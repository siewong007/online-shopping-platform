# AI inbox

Drop model outputs here. Nothing in this folder is live on the site.

- `manus-images/` — **retired**. Do not add new Manus shards.
- `opencode-verify/` — Job 1 done; Job 0 live-check of existing pass images.
- `opencode-recover/` — `remaining-all-worklist.csv` is the full remaining catalogue. Do not overwrite `recover-pass1.csv`.
- `gemini-image-reverify/` — closed 1–2500/p300. Last verify waits for OpenCode FULL CATALOGUE COMPLETE.
- `claude-review/` — **done** (`20260819.md`).
- `deepseek-image-verify/` — **retired**. Leave empty.

Grok (or `python scripts/check-ai-inbox.py`) validates schema only. Images still need owner rights before import. Gemini must not be given pending rows.
