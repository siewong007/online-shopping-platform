#!/usr/bin/env python3
"""Fetch page+image evidence for rows of a researcher shard CSV.

Usage:
  python fetch_from_shard.py --shard <shard.csv> --out <evidence.json> [--positions 1,2,3]

Shard CSV needs: source_position, official_product_page, official_image_url.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_evidence import fetch_row  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--shard", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--positions", default="")
    ap.add_argument("--batch", type=int, default=25)
    ap.add_argument("--round", type=int, default=1)
    args = ap.parse_args()

    want = {p.strip() for p in args.positions.split(",") if p.strip()}
    todo = []
    with open(args.shard, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            pos = r["source_position"]
            if want and pos not in want:
                continue
            if not (r.get("official_product_page") or r.get("official_image_url")):
                continue
            todo.append((pos, (r.get("official_product_page") or "").strip(),
                         (r.get("official_image_url") or "").strip()))

    ev_all = {}
    ev_path = Path(args.out)
    if ev_path.exists():
        ev_all = json.loads(ev_path.read_text(encoding="utf-8"))

    print(f"fetching {len(todo)} shard rows -> {ev_path.name}")
    done = 0
    for i in range(0, len(todo), args.batch):
        chunk = todo[i:i + args.batch]
        with ThreadPoolExecutor(max_workers=args.batch) as ex:
            futs = {ex.submit(fetch_row, p, pg, im): p for p, pg, im in chunk}
            for fut in as_completed(futs):
                p = futs[fut]
                try:
                    ev = fut.result()
                except Exception as e:
                    ev = {"page_status": -1, "image_status": -1, "error": repr(e)}
                ev["fetched_round"] = args.round
                ev_all[p] = ev
                done += 1
        ev_path.write_text(json.dumps(ev_all), encoding="utf-8")
    ok_img = sum(1 for p, _, _ in todo if ev_all.get(p, {}).get("image_status") == 200)
    ok_big = sum(1 for p, _, _ in todo
                 if max(ev_all.get(p, {}).get("px_w", 0) or 0,
                        ev_all.get(p, {}).get("px_h", 0) or 0) >= 500)
    print(f"done={done} images_ok={ok_img} >=500px={ok_big}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
