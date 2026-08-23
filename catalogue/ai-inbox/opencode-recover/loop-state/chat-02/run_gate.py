"""chat-02 local gate runner. IMPORTS gate.py unmodified and applies its exact
red-check logic to chat-02 shard rows using chat-02 evidence + shared pagecache.
Usage: python run_gate.py --round N
Writes: chat-02/gate-report-rN.json ; prints summary. Does NOT edit shards.
"""
import argparse, csv, json, os, sys, re
from collections import Counter, defaultdict
from urllib.parse import urlparse

STATE_DIR = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
CHAT2 = os.path.join(STATE_DIR, "chat-02")
RECOVER = os.path.dirname(STATE_DIR)
PAGECACHE = os.path.join(RECOVER, "pagecache")
sys.path.insert(0, STATE_DIR)
import gate as G  # noqa: E402  (owned by chat 01 - never modified)

HDR = G.LEDGER_HEADER

def load_shards():
    merged = {}
    for fn in sorted(os.listdir(CHAT2)):
        if fn.startswith("shard-") and fn.endswith(".csv"):
            with open(os.path.join(CHAT2, fn), newline="", encoding="utf-8") as fh:
                rdr = csv.DictReader(fh)
                if rdr.fieldnames != HDR:
                    raise SystemExit(f"{fn}: header mismatch vs LEDGER_HEADER: {rdr.fieldnames}")
                for r in rdr:
                    merged[r["source_position"]] = r
    return [merged[k] for k in sorted(merged, key=lambda x: int(x))]

def load_evidence():
    ev = {}
    p = os.path.join(CHAT2, "evidence.json")
    if os.path.exists(p):
        ev.update(json.load(open(p, encoding="utf-8")))
    return ev

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--round", type=int, default=1)
    a = ap.parse_args()
    rows = load_shards()
    ev = load_evidence()
    reds = []
    def red(r, code, detail):
        reds.append({"key": f"{r['item_code']}|{r['uom']}#{r['source_position']}",
                     "code": code, "detail": detail[:400]})

    # ---- schema ----
    keycount = Counter((r["item_code"], r["uom"]) for r in rows)
    first_owner = {}
    for r in rows:
        first_owner.setdefault((r["item_code"], r["uom"]), r)
    def is_dup_child(r):
        k = (r["item_code"], r["uom"])
        return keycount[k] > 1 and first_owner[k]["source_position"] != r["source_position"]
    def declared_dup(r):
        return is_dup_child(r) and "action=duplicate_listing" in (r.get("reason") or "")

    for r in rows:
        st = r["state"]
        rs = (r.get("rights_status") or "").strip().lower()
        if rs and rs not in G.ALLOWED_RIGHTS:
            red(r, "red:rights", f"rights_status={rs!r}")
        if st != "open":
            reason = (r.get("reason") or "").strip()
            if not reason:
                red(r, "red:schema", "empty reason on non-open row")
            elif "q:" not in reason and "action=skip_pass" not in reason.split("|")[0]:
                red(r, "red:schema", "empty query log")
        if st == "verified_pass":
            if (r.get("model_exact") or "").lower() != "yes":
                red(r, "red:schema", "verified_pass requires model_exact=yes")
            if (r.get("finish_exact") or "").lower() != "yes":
                red(r, "red:schema", "verified_pass requires finish_exact=yes")

    # ---- gated assets ----
    url_claims, sha_claims = defaultdict(set), defaultdict(set)
    for r in rows:
        if r["state"] not in G.GATED_STATES:
            continue
        pos = r["source_position"]
        e = ev.get(pos)
        img_url = (r.get("official_image_url") or "").strip()
        page_url = (r.get("official_product_page") or "").strip()
        if not page_url or not img_url:
            red(r, "red:http", "missing page or image URL")
        if e is None:
            red(r, "red:http", f"no fetched evidence for position {pos}")
            continue
        for what, status, final in (("page", e.get("page_status"), e.get("page_final_url", "")),
                                    ("image", e.get("image_status"), e.get("image_final_url", ""))):
            if status != 200:
                red(r, "red:http", f"{what} status={status} for {final or '?'}")
            low = (final or "").lower()
            if status == 200 and any(h in low for h in G.BAD_REDIRECT_HINTS):
                red(r, "red:http", f"{what} redirected to search/404-like URL: {final}")
        ct = (e.get("image_content_type") or "").lower()
        if not ct.startswith("image/"):
            red(r, "red:content_type", f"content-type={ct or 'missing'}")
        blen = int(e.get("image_bytes_len") or 0)
        pw, ph = int(e.get("px_w") or 0), int(e.get("px_h") or 0)
        if max(pw, ph) < 500 or blen < 20000:
            red(r, "red:too_small", f"long_edge={max(pw,ph)}px bytes={blen}")
        m = G.THUMB_RE.search(img_url)
        if m and int(m.group(1)) < 500 and pw < 500:
            red(r, "red:thumbnail_path", img_url[:120])
        host = urlparse(img_url).netloc.lower() + " " + urlparse(page_url).netloc.lower()
        if any(b in host for b in G.MARKETPLACE_HOSTS):
            red(r, "red:marketplace", host.strip())
        txt_file = os.path.join(PAGECACHE, f"{pos}.txt")
        page_text = open(txt_file, encoding="utf-8", errors="ignore").read() if os.path.exists(txt_file) else ""
        if not G.model_present(r, page_text):
            red(r, "red:model_absent", str(G.model_variants(r)[:3]))
        url_claims[img_url].add(f"{r['item_code']}|{r['uom']}#{pos}")
        sha = e.get("image_sha256") or ""
        if sha:
            sha_claims[sha].add(f"{r['item_code']}|{r['uom']}#{pos}")

    owner_of_key = {f"{r['item_code']}|{r['uom']}#{r['source_position']}": r for r in rows}
    for url, keys in url_claims.items():
        if len(keys) < 2:
            continue
        owners = [owner_of_key[k] for k in keys]
        base = min(owners, key=lambda x: int(x["source_position"]))
        colliders = [o for o in owners if o is not base]
        legit = [o for o in colliders if is_dup_child(o) and declared_dup(o)]
        if len(legit) != len(colliders):
            for k in keys:
                red(owner_of_key[k], "red:shared_image", f"url claimed by {len(keys)} rows: {url[:160]}")
    for sha, keys in sha_claims.items():
        if len(keys) < 2:
            continue
        poss = sorted(int(k.rsplit("#", 1)[1]) for k in keys)
        if not all(declared_dup(owner_of_key[k]) for k in list(keys)[1:]):
            for k in keys:
                red(owner_of_key[k], "red:hash_collision", f"sha256 shared across positions {poss}")
    for r in rows:
        if is_dup_child(r) and r["state"] in G.GATED_STATES:
            par = first_owner[(r["item_code"], r["uom"])]
            if par["state"] not in G.GATED_STATES:
                red(r, "red:duplicate_parent", f"parent {par['source_position']} is {par['state']}")

    report = {"round": a.round, "rows_total": len(rows),
              "states": dict(Counter(r["state"] for r in rows)),
              "reds_by_code": dict(Counter(x["code"] for x in reds)), "reds": reds}
    out = os.path.join(CHAT2, f"gate-report-r{a.round}.json")
    json.dump(report, open(out, "w", encoding="utf-8"), indent=1)
    print(json.dumps({k: report[k] for k in ("round", "rows_total", "states", "reds_by_code")}, indent=1))

if __name__ == "__main__":
    main()
