# Manus pass 1 — diagnosis (19 August 2026)

Manus marked the campaign COMPLETE. The numbers look like a full pass. They are not.

| Claim | Actual |
|---|---|
| 7,771 covered | Coverage **index** filled. Most 2501–7771 rows have **no search URL** |
| 151 verified | **140** copied from locked 1–2500 research; **11** new in 2501–7771 |
| 11 image files saved | Positions 2531, 2576, 2582, 2645, 2705, 2830, 3243, 3344, 3427, 3512, 3729 |
| 5,260 pending in 2501–7771 | **2,838** have brand or model tokens and were never searched |
| Shards 3801–7771 | Bulk PENDING, 0 candidates, notes say “no exact image evidence preserved” |

## Root causes

1. Treated fail-closed as “don’t look.” PENDING with blank `source_url` is incomplete.
2. Did not parse item codes (`LAD-ALU-WEL-D07`, `IND-COO-MID-MIC222TLAGN`).
3. Stopped after official `.com.my` product pages. Skipped global OEM pages, PDFs, authorised MY distributors.
4. Bulk-closed generic-looking shards instead of extracting model tokens.
5. Required a locally hashed image before recording even a page URL.

## What we do next

Do **not** accept COMPLETE. Send Manus `docs/ai-prompts/manus-retry-useful-research.md`.

Retry queue (already generated): `catalogue/ai-inbox/manus-images/retry-queue-branded-2501-7771.csv` (2,838 rows).

Generic screws/bolts (~2,422) wait until the branded/model queue is actually searched.
