#!/usr/bin/env python3
# ============================================================
# FROZEN by chat 01 (coordinator). Workers import/run, never edit.
# Schema semantics (2026-08-22):
#   red:schema        = structurally unusable evidence record: header mismatch,
#                       duplicate undeclared item_code+uom, missing key columns,
#                       verified_pass without literal exact flags.
#   amber:log_incomplete = logging defect only (empty reason / empty query log on a
#                       non-skip_pass non-open row whose evidence is otherwise fine).
#                       Repair = backfill the log and re-gate. Never discard the row.
# ============================================================
"""Deterministic machine gate for the Ekoway image-sourcing recovery loop.

Usage:
  python gate.py [--round NN]

Reads:
  loop-state/loop-ledger.csv          rolling ledger (all 7,771 rows)
  loop-state/evidence.json            fetched URL evidence keyed by source_position
  catalogue/ai-inbox/opencode-recover/pagecache/<source_position>.txt  cached page/PDF text

Writes:
  loop-state/round-NN/gate-report.json

A row may only sit in `verified_pass` or `candidate` if every check relevant to it
passes. Any red moves the row back to `open` (the driver applies transitions; the
gate only judges). Model opinion does not decide termination - this script does.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

STATE_DIR = Path(__file__).resolve().parent
RECOVER = STATE_DIR.parents[0]  # catalogue/ai-inbox/opencode-recover/
PAGECACHE = RECOVER / "pagecache"

LEDGER_HEADER = [
    "source_position", "item_code", "uom", "display_name", "category",
    "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
    "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
    "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
    "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
    "machine_gate", "reason", "human_action",
]

ALLOWED_RIGHTS = {"needs_permission", "unknown", "no_asset"}
GATED_STATES = {"candidate", "verified_pass"}

MARKETPLACE_HOSTS = (
    "shopee", "lazada", "facebook", "fbcdn", "aliexpress", "alibaba",
    "google.", "gstatic", "googleusercontent", "tiktok", "instagram", "pinterest",
)
# Small-transform segments that mark a thumbnail derivative, not a product asset.
THUMB_RE = re.compile(r"/(\d{2,4})x(\d{1,4})/")
BAD_REDIRECT_HINTS = ("/search", "?s=", "?q=", "/404", "404.", "not-found", "notfound",
                      "page-not-found", "/error")

def norm_text(s: str) -> str:
    return re.sub(r"[^0-9A-Za-z]+", "", s or "").upper()

def model_variants(ledger_row: dict) -> list[str]:
    """Model strings whose presence we require in the page text."""
    out = []
    dm = (ledger_row.get("detected_model") or "").strip()
    ic = (ledger_row.get("item_code") or "").strip()
    if dm:
        n = norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            # token-wise variant for spec-style models like 105MMX1.2MMX16MM
            toks = [norm_text(t) for t in re.split(r"[^0-9A-Za-z]+", dm) if norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append("TOKENS:" + "|".join(longtoks))
    # strip leading brand prefix segments from item code: BOS-2608-619-701 -> 2608619701
    parts = ic.split("-")
    if len(parts) > 1:
        tail = "".join(parts[1:])
        n = norm_text(tail)
        if len(n) >= 4:
            out.append(n)
        # consecutive-segment spans: item codes often embed category prefixes
        # (ELE-D/L-MEG-YTA60Z1-10W -> YTA60Z110W, YTA60Z1) that OEM pages omit.
        segs = [norm_text(s) for s in parts[1:] if norm_text(s)]
        for i in range(len(segs)):
            acc = ""
            for j in range(i, len(segs)):
                acc += segs[j]
                if len(acc) >= 5 and any(c.isdigit() for c in acc):
                    out.append(acc)
    seen, uniq = set(), []
    for v in out:
        if v not in seen:
            seen.add(v)
            uniq.append(v)
    return uniq

def model_present(row: dict, page_text: str) -> bool:
    if not page_text:
        return False
    nt = norm_text(page_text)
    if not nt:
        return False
    for v in model_variants(row):
        if v.startswith("TOKENS:"):
            toks = [t for t in v.split(":", 1)[1].split("|") if t]
            if toks and all(t in nt for t in toks):
                return True
        elif len(v) >= 4 and v in nt:
            return True
    return False

class Gate:
    def __init__(self, round_no: int):
        self.round_no = round_no
        self.reds: list[dict] = []

    def red(self, key: str, code: str, detail: str):
        prefix = "amber:" if code.startswith("amber") else "red:"
        label = {"amber_log": "amber:log_incomplete"}.get(code, f"{prefix}{code}")
        self.reds.append({"key": key, "code": label, "detail": detail[:400]})

def load_ledger(path: Path) -> tuple[list[dict], list[str]]:
    with open(path, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        header = rdr.fieldnames or []
        rows = list(rdr)
    return rows, header

def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", type=int, default=0)
    args = ap.parse_args(argv)
    g = Gate(args.round)

    ledger_path = STATE_DIR / "loop-ledger.csv"
    evidence_path = STATE_DIR / "evidence.json"
    rows, header = load_ledger(ledger_path)
    if header != LEDGER_HEADER:
        g.red("*LEDGER*", "schema", f"header mismatch: {header}")
    ev = {}
    ev_files = sorted(STATE_DIR.glob("evidence*.json"))
    ev_files += sorted(STATE_DIR.glob("chat-01/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-02/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-03/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-04/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-05/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-06/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-07/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-08/evidence*.json")) \
        + sorted(STATE_DIR.glob("chat-09/evidence*.json"))
    for efp in ev_files:
        try:
            data = json.loads(efp.read_text(encoding="utf-8"))
            for k, v in data.items():
                old = ev.get(k)
                if old is None or (v.get("fetched_round") or 0) >= (old.get("fetched_round") or 0):
                    ev[k] = v
        except Exception as e:
            g.red("*EVIDENCE*", "schema", f"unreadable evidence file {efp.name}: {e!r}")

    # ---- schema-level checks --------------------------------------------
    keycount = Counter((r["item_code"], r["uom"]) for r in rows)
    action_by_pos = {}
    for r in rows:
        action_by_pos[r["source_position"]] = r.get("reason", "").split(";")[0]

    # duplicate_listing resolution: first occurrence is parent
    first_owner: dict[tuple, dict] = {}
    for r in rows:
        k = (r["item_code"], r["uom"])
        first_owner.setdefault(k, r)
    is_dup_child: dict[str, bool] = {}
    for r in rows:
        k = (r["item_code"], r["uom"])
        is_dup_child[r["source_position"]] = (
            keycount[k] > 1 and first_owner[k]["source_position"] != r["source_position"]
        )

    def is_declared_dup(r: dict) -> bool:
        return is_dup_child.get(r["source_position"], False) and \
            "action=duplicate_listing" in (r.get("reason") or "")

    extra_rows = [r for r in rows
                  if first_owner[(r["item_code"], r["uom"])]["source_position"]
                  != r["source_position"]]
    for r in extra_rows:
        key = f"{r['item_code']}|{r['uom']}#{r['source_position']}"
        if not is_declared_dup(r):
            g.red(key, "schema", f"extra row under duplicated item_code+uom "
                                 f"{(r['item_code'], r['uom'])} without declared duplicate_listing")
        rs = (r.get("rights_status") or "").strip().lower()
        if rs and rs not in ALLOWED_RIGHTS:
            g.red(key, "rights", f"rights_status={rs!r} not in {sorted(ALLOWED_RIGHTS)}")
        state = r["state"]
        reason = (r.get("reason") or "").strip()
        if state != "open" and not reason:
            g.red(key, "amber_log", "empty reason on non-open row (log defect, repairable)")
        if state != "open":
            src_is_skip = "action=skip_pass" in reason.split("|")[0]
            has_queries = "q:" in reason
            if not src_is_skip and not has_queries:
                g.red(key, "amber_log", "empty query log on non-skip_pass row (repairable)")

    # ---- asset-level checks ---------------------------------------------
    url_claims: dict[str, set] = defaultdict(set)   # image url -> {key}
    sha_claims: dict[str, set] = defaultdict(set)   # sha256 -> {key}
    claimed_rows = [r for r in rows if r["state"] in GATED_STATES]

    for r in claimed_rows:
        key = f"{r['item_code']}|{r['uom']}#{r['source_position']}"
        pos = r["source_position"]
        e = ev.get(pos)
        img_url = (r.get("official_image_url") or "").strip()
        page_url = (r.get("official_product_page") or "").strip()

        if not page_url or not img_url:
            g.red(key, "http", "candidate/verified_pass row missing page or image URL")
        if e is None:
            g.red(key, "http", f"no fetched evidence for position {pos} this session")
            continue

        # red:http
        for what, status, final in (
            ("page", e.get("page_status"), e.get("page_final_url", "")),
            ("image", e.get("image_status"), e.get("image_final_url", "")),
        ):
            if status != 200:
                g.red(key, "http", f"{what} status={status} for {final or '?'}")
            low = (final or "").lower()
            if any(h in low for h in BAD_REDIRECT_HINTS) and status == 200:
                g.red(key, "http", f"{what} redirected to search/404/home-like URL: {final}")

        ct = (e.get("image_content_type") or "").lower()
        if not ct.startswith("image/"):
            g.red(key, "content_type", f"content-type={ct or 'missing'}")

        blen = int(e.get("image_bytes_len") or 0)
        pw = int(e.get("px_w") or 0)
        ph = int(e.get("px_h") or 0)
        long_edge = max(pw, ph)
        if long_edge < 500 or blen < 20000:
            g.red(key, "too_small", f"long_edge={long_edge}px bytes={blen}")

        m = THUMB_RE.search(img_url)
        if m:
            wpx, hpx = int(m.group(1)), int(m.group(2))
            if max(wpx, hpx) < 500 and pw < 500:
                g.red(key, "thumbnail_path", f"URL transform segment /{wpx}x{hpx}/ and pixels {pw}x{ph}")

        host = urlparse(img_url).netloc.lower() + " " + urlparse(page_url).netloc.lower()
        if any(bad in host for bad in MARKETPLACE_HOSTS):
            g.red(key, "marketplace", f"forbidden host: {host.strip()}")

        # red:model_absent
        txt_file = PAGECACHE / f"{pos}.txt"
        page_text = txt_file.read_text(encoding="utf-8", errors="ignore") if txt_file.exists() else ""
        if not model_present(r, page_text):
            g.red(key, "model_absent", f"model variants {model_variants(r)[:3]} absent from cached page text")

        if img_url:
            url_claims[img_url].add(key)
        sha = e.get("image_sha256") or r.get("image_sha256") or ""
        if sha:
            sha_claims[sha].add(key)

        if r["state"] == "verified_pass":
            if (r.get("model_exact") or "").lower() != "yes":
                g.red(key, "schema", "verified_pass requires model_exact=yes")
            if (r.get("finish_exact") or "").lower() != "yes":
                g.red(key, "schema", "verified_pass requires finish_exact=yes")

    # red:shared_image - fail every row in a collision unless the extra claimants
    # are declared duplicate children of the owner.
    owner_of_key = {}
    for r in rows:
        owner_of_key[f"{r['item_code']}|{r['uom']}#{r['source_position']}"] = r
    for url, keys in url_claims.items():
        if len(keys) < 2:
            continue
        owners = [owner_of_key[k] for k in keys]
        base = min(owners, key=lambda x: int(x["source_position"]))
        colliders = [o for o in owners if o["source_position"] != base["source_position"]]
        legit = [o for o in colliders
                 if is_dup_child[o["source_position"]] and
                 (o["item_code"], o["uom"]) == (base["item_code"], base["uom"])]
        if len(legit) != len(colliders):
            for k in sorted(keys):
                g.red(k, "shared_image", f"url claimed by {len(keys)} rows: {url[:160]}")

    for sha, keys in sha_claims.items():
        if len(keys) < 2:
            continue
        poss = sorted(int(k.rsplit("#", 1)[1]) for k in keys)
        # duplicates of the same listing sharing an asset are fine
        pairs_ok = all(is_dup_child.get(str(p), False) for p in poss[1:])
        if not pairs_ok:
            for k in sorted(keys):
                g.red(k, "hash_collision", f"sha256 shared across positions {poss}")

    # red:duplicate_parent - duplicate child cannot out-rank its parent
    for r in rows:
        if not is_dup_child.get(r["source_position"], False):
            continue
        k = (r["item_code"], r["uom"])
        parent = first_owner[k]
        if r["state"] in GATED_STATES and parent["state"] not in GATED_STATES:
            key = f"{r['item_code']}|{r['uom']}#{r['source_position']}"
            g.red(key, "duplicate_parent",
                  f"parent position {parent['source_position']} is {parent['state']}")

    # ---- report -----------------------------------------------------------
    by_code = Counter(x["code"] for x in g.reds)
    report = {
        "round": args.round,
        "rows_total": len(rows),
        "gated_states": {s: sum(1 for r in rows if r["state"] == s) for s in
                         ["open", "candidate", "verified_pass", "exhausted", "exhausted_no_progress"]},
        "reds_by_code": dict(by_code),
        "reds": g.reds,
    }
    out_dir = STATE_DIR / (f"round-{args.round:02d}" if args.round else "")
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "gate-report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("round", "rows_total", "gated_states", "reds_by_code")},
                     indent=1))
    return 0

if __name__ == "__main__":
    sys.exit(main())
