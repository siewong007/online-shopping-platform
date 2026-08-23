#!/usr/bin/env python3
"""One-off: add missing row 3832 to f2-new-rows.json."""
import json
from pathlib import Path
p = Path(__file__).resolve().parent / "f2-new-rows.json"
rows = json.loads(p.read_text(encoding="utf-8"))
have = {r[0] for r in rows}
if "3832" not in have:
    rows.append(["3832", "BNW-BOL-SS304-M12-40MM", "PCS", "", "", "reject", "R", "no", "no",
                 "pcs_ok", "no_asset",
                 "tier1 start; outage BLOCKER (websearch parallel.ai HTTP429 x7 spaced ~35min; "
                 "bing_html query-unrelated junk; ddg captcha; mojeek 403) -> mandated q1-q6 UNRUN "
                 "this session. Commodity A2/DIN931 SS304 hex bolt M12x40 generic_unbranded no OEM "
                 "page concept; same-file siblings 3468 M12x50 / 3884 M12x30; ledger prior reject upheld",
                 "none"])
p.write_text(json.dumps(rows), encoding="utf-8")
print("rows:", len(rows))
