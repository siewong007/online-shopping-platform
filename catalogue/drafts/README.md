# Catalogue drafts (1.3) — not applied

Generated 18 August 2026 from `catalogue/image-sourcing/product-image-manifest.csv`.

| File | What |
|---|---|
| `display_name_proposed.csv` | 7,771 rows. Automatic rename found **0** safe mechanical cleanups (names are already single-spaced). Do not invent shop titles. |
| `category_proposed.csv` | All **228 Other** rows. Conservative keyword moves only. |
| `owner_sample_30.csv` | 15 proposed moves + 15 kept as Other. Approve this sample before anything is imported. |
| `price_update_2026-08-20_import.csv` | **0.8** — 7,771-row catalogue import with AutoCount Price 1. UOM-mismatch and zero-price SKUs keep the previous `price_myr`. Not imported to live/DB yet. |
| `price_update_2026-08-20_changes.csv` | 7,157 before/after selling-price rows. |
| `price_uom_mismatch_review.csv` | 317 SKUs where catalogue UOM ≠ Excel base UOM. Not applied. |
| `price_zero_or_unmatched.csv` | 85 Excel Price 1 = 0 plus 2 codes missing from Excel. |

`source_item_code` / `item_code` is never changed.

Name/category drafts: **not applied.** M1 may ship AutoCount names as they are.

Price 1: **applied to the catalogue CSVs** (`product-image-manifest.csv`, `priority-300.csv`). Not applied to the live shop until import + deploy. See `docs/0.8-price-update-2026-08-20.md`.
