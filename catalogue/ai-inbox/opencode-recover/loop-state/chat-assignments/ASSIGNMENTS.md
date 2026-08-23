# Nine-chat split — Ekoway image loop

Generated 2026-08-22. Coverage is exact: **7,558 ordinal rows + 116 open skip_pass + 97 already `verified_pass` = 7,771**.

Ordinals come from `../research-ordinal-index.csv`. Blocks are disjoint. No two chats may touch the same `item_code+uom`.

| Chat | Assignment file | Ordinals | Rows | Mix | Start tier |
|---|---|---|---:|---|---|
| 01 (existing) | `chat-01.csv` + `chat-01-livecheck-open.csv` | 1–840 | 840 + 116 | 838 search, 2 dup, 116 demoted skip_pass | tier 1 (252 rows already have tier 1 → resume at tier 2) |
| 02 | `chat-02.csv` | 841–1680 | 840 | 838 search, 2 dup | tier 1 |
| 03 | `chat-03.csv` | 1681–2520 | 840 | 836 search, 4 dup | tier 1 |
| 04 | `chat-04.csv` | 2521–3360 | 840 | 830 search, 10 dup | tier 1 |
| 05 | `chat-05.csv` | 3361–4200 | 840 | 835 search, 5 dup | tier 1 |
| 06 | `chat-06.csv` | 4201–5040 | 840 | 829 search, 11 dup | tier 1 |
| 07 | `chat-07.csv` | 5041–5880 | 840 | 140 search, 683 reopen, 17 dup | tier 1 for search, **tier 2** for reopen |
| 08 | `chat-08.csv` | 5881–6720 | 840 | 836 reopen, 4 dup | **tier 2** |
| 09 | `chat-09.csv` | 6721–7558 | 838 | 774 reopen, 64 dup | **tier 2** |

`reopen` rows already failed tier 1 in an earlier sitting. Starting them at tier 1 repeats a known dead end — chats 07–09 begin at tier 2 (model-string normalisation) and escalate from there.

## Write isolation — the rule that keeps nine chats from corrupting each other

Each chat writes **only** inside `loop-state/chat-NN/`. Everything else in the repo is read-only to workers.

| Path | Who may write |
|---|---|
| `loop-state/chat-NN/**` | chat NN only |
| `loop-state/loop-ledger.csv` | **chat 01 only**, at merge time |
| `loop-state/gate.py` and the other `*.py` | **chat 01 only**, then frozen |
| `loop-state/round-01/`, `round-02/` | nobody — historical |
| `assets/{source_position}.{ext}` | any chat, but only for its own rows |
| `pagecache/` | any chat (keyed by URL hash) |
| `coverage-index.csv`, `remaining-all-pass1.csv` | chat 01 only, at the end |

## Per-chat outputs (identical layout in every `chat-NN/` folder)

- `shard-<ordlo>-<ordhi>.csv` — researcher output
- `verify-<ordlo>-<ordhi>.csv` — blind verifier output
- `hashes.csv` — `source_position,item_code,uom,official_image_url,image_sha256,image_px_w,image_px_h,image_bytes` for every image fetched
- `chat-NN-ledger.csv` — this chat's slice, **same 27-column header** as `loop-ledger.csv`
- `ROUND-REPORT.md` — one block per round

## Global gate checks that a worker cannot run alone

`red:shared_image` and `red:hash_collision` compare a row against the **whole** catalogue. A worker only sees its own 840 rows, so it runs them locally and chat 01 re-runs them globally at merge. A row can be locally green and globally red — chat 01's verdict wins.

This is not theoretical: round 1 caught the Megaman `wp-content/uploads` family heroes exactly this way, where the blind verifier had passed them.

## Slices and claims — fleet saturation

`slices.csv` cuts all 7,674 rows into **156 slices of 50**, each with a stable `slice_id` and a `home_chat`. `claims/` is the coordination surface: a chat creates `claims/{slice_id}.claim` with exclusive create before working a slice, heartbeats it every ~15 min, and writes `claims/{slice_id}.done` on completion.

A chat works its home slices first, then **steals any unclaimed slice, highest `home_chat` first** — chats 08–09 hold the `reopen` rows and will lag, so that is where spare capacity is worth most. Stolen output goes in the stealing chat's own folder as `stolen-{slice_id}.csv`; nobody ever writes into another chat's folder.

A `.claim` older than 45 minutes with no `.done` means that chat died — any chat may take it over by writing `claims/{slice_id}.takeover-NN`.

`CHAT NN BLOCK COMPLETE` is a progress line, not a stop line. A chat stops only at `CHAT NN DRAINED`, when no slice anywhere lacks both a `.claim` and a `.done`. Do not regenerate `slices.csv` — nine chats depend on the ids being stable.
