#!/usr/bin/env python3
"""Local pre-gate for the chat-06 block.

Imports loop-state/gate.py UNMODIFIED and runs its exact check sequence against
chat-06-ledger.csv only (evidence + pagecache are the shared ones). Applies the
apply_gate transition rules to my own file. Chat 01's global gate remains the
final authority; this never writes outside chat-06/.
"""
import csv, json, sys
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent           # loop-state/chat-06
LOOP_STATE = HERE.parent                          # loop-state
RECOVER = LOOP_STATE.parent                       # opencode-recover/
PAGECACHE = RECOVER / "pagecache"

sys.path.insert(0, str(LOOP_STATE))
import gate  # noqa: E402


def main(round_no: int) -> int:
    rows, _ = gate.load_ledger(HERE / "chat-06-ledger.csv")
    g = gate.Gate(round_no)

    ev = {}
    for efp in sorted(LOOP_STATE.glob("evidence*.json")):
        try:
            data = json.loads(efp.read_text(encoding="utf-8"))
            for k, v in data.items():
                old = ev.get(k)
                if old is None or (v.get("fetched_round") or 0) >= (old.get("fetched_round") or 0):
                    ev[k] = v
        except Exception as e:
            g.red("*EVIDENCE*", "schema", f"unreadable evidence file {efp.name}: {e!r}")

    # ---- schema-level checks (mirrors gate.main) --------------------------
    keycount = Counter((r["item_code"], r["uom"]) for r in rows)
    first_owner = {}
    for r in rows:
        k = (r["item_code"], r["uom"])
        first_owner.setdefault(k, r)
    is_dup_child = {
        r["source_position"]:
            keycount[(r["item_code"], r["uom"])] > 1 and
            first_owner[(r["item_code"], r["uom"])]["source_position"] != r["source_position"]
        for r in rows
    }

    def is_declared_dup(r):
        return is_dup_child.get(r["source_position"], False) and \
            "action=duplicate_listing" in (r.get("reason") or "")

    for r in rows:
        key = f"{r['item_code']}|{r['uom']}#{r['source_position']}"
        if first_owner[(r["item_code"], r["uom"])]["source_position"] != r["source_position"]:
            if not is_declared_dup(r):
                g.red(key, "schema", "extra row under duplicated item_code+uom "
                                     "without declared duplicate_listing")
            rs = (r.get("rights_status") or "").strip().lower()
            if rs and rs not in gate.ALLOWED_RIGHTS:
                g.red(key, "rights", f"rights_status={rs!r} not in {sorted(gate.ALLOWED_RIGHTS)}")
        state = r["state"]
        reason = (r.get("reason") or "").strip()
        if state != "open" and not reason:
            g.red(key, "schema", "empty reason on non-open row")
        if state != "open":
            src_is_skip = "action=skip_pass" in reason.split("|")[0]
            if not src_is_skip and "q:" not in reason:
                g.red(key, "schema", "empty query log on non-skip_pass row")

    # ---- asset-level checks -----------------------------------------------
    url_claims = defaultdict(set)
    sha_claims = defaultdict(set)
    for r in rows:
        if r["state"] not in gate.GATED_STATES:
            continue
        pos = r["source_position"]
        key = f"{r['item_code']}|{r['uom']}#{pos}"
        e = ev.get(pos)
        img_url = (r.get("official_image_url") or "").strip()
        page_url = (r.get("official_product_page") or "").strip()

        if not page_url or not img_url:
            g.red(key, "http", "candidate/verified_pass row missing page or image URL")
        if e is None:
            g.red(key, "http", f"no fetched evidence for position {pos} this session")
            continue

        for what, status, final in (
            ("page", e.get("page_status"), e.get("page_final_url", "")),
            ("image", e.get("image_status"), e.get("image_final_url", "")),
        ):
            if status != 200:
                g.red(key, "http", f"{what} status={status} for {final or '?'}")
            low = (final or "").lower()
            if any(h in low for h in gate.BAD_REDIRECT_HINTS) and status == 200:
                g.red(key, "http", f"{what} redirected to search/404/home-like URL: {final}")

        ct = (e.get("image_content_type") or "").lower()
        if not ct.startswith("image/"):
            g.red(key, "content_type", f"content-type={ct or 'missing'}")

        blen = int(e.get("image_bytes_len") or 0)
        pw = int(e.get("px_w") or 0)
        ph = int(e.get("px_h") or 0)
        if max(pw, ph) < 500 or blen < 20000:
            g.red(key, "too_small", f"long_edge={max(pw, ph)}px bytes={blen}")

        m = gate.THUMB_RE.search(img_url)
        if m:
            wpx, hpx = int(m.group(1)), int(m.group(2))
            if max(wpx, hpx) < 500 and pw < 500:
                g.red(key, "thumbnail_path",
                      f"URL transform segment /{wpx}x{hpx}/ and pixels {pw}x{ph}")

        host = urlparse(img_url).netloc.lower() + " " + urlparse(page_url).netloc.lower()
        if any(bad in host for bad in gate.MARKETPLACE_HOSTS):
            g.red(key, "marketplace", f"forbidden host: {host.strip()}")

        txt_file = PAGECACHE / f"{pos}.txt"
        page_text = txt_file.read_text(encoding="utf-8", errors="ignore") if txt_file.exists() else ""
        if not gate.model_present(r, page_text):
            g.red(key, "model_absent",
                  f"model variants {gate.model_variants(r)[:3]} absent from cached page text")

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

    owner_of_key = {f"{r['item_code']}|{r['uom']}#{r['source_position']}": r for r in rows}
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
        pairs_ok = all(is_dup_child.get(str(p), False) for p in poss[1:])
        if not pairs_ok:
            for k in sorted(keys):
                g.red(k, "hash_collision", f"sha256 shared across positions {poss}")

    # ---- report ------------------------------------------------------------
    report = {
        "round": round_no,
        "rows_total": len(rows),
        "gated_states": {s: sum(1 for r in rows if r["state"] == s) for s in
                         ["open", "candidate", "verified_pass", "exhausted",
                          "exhausted_no_progress"]},
        "reds_by_code": dict(Counter(x["code"] for x in g.reds)),
        "reds": g.reds,
    }
    (HERE / f"gate-report-local-R{round_no:02d}.json").write_text(
        json.dumps(report, indent=1), encoding="utf-8")

    # ---- transitions (mirrors apply_gate rules, my file only) ---------------
    red_by_pos = {}
    for x in g.reds:
        pos = x["key"].rsplit("#", 1)[-1]
        cur = red_by_pos.get(pos)
        if cur is None or x["code"] < cur["code"]:
            red_by_pos[pos] = x

    promoted = demoted = 0
    codes = Counter()
    for r in rows:
        if r["state"] != "candidate":
            continue
        pos = r["source_position"]
        red = red_by_pos.get(pos)
        if red is None:
            r["state"] = "verified_pass"
            r["machine_gate"] = "green"
            r["round_last_touched"] = str(round_no)
            if not r.get("verifier_verdict"):
                r["verifier_verdict"] = "pass"
            promoted += 1
        else:
            r["state"] = "open"
            r["machine_gate"] = red["code"]
            r["researcher_decision"] = ""
            r["verifier_verdict"] = ""
            r["round_last_touched"] = str(round_no)
            note = f" | r{round_no}:gate-fail {red['code']} {red['detail'][:180]}"
            if note not in r["reason"]:
                r["reason"] += note
            if not r["human_action"]:
                r["human_action"] = f"requeue at tier+1 after {red['code']}"
            codes[red["code"]] += 1
            demoted += 1

    with (HERE / "chat-06-ledger.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=gate.LEDGER_HEADER)
        w.writeheader()
        for r in sorted(rows, key=lambda x: int(x["source_position"])):
            w.writerow(r)

    print(f"local gate R{round_no}: rows={len(rows)} promoted={promoted} demoted={demoted} "
          f"reds={dict(codes)} states={report['gated_states']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1))
