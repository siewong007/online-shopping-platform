#!/usr/bin/env python3
"""Chat-07 round driver: aggregate research+verify -> evidence -> local gate -> ledger."""
import csv, glob, hashlib, json, os, sys, threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent          # loop-state/chat-07
STATE = HERE.parent                             # loop-state
RECOVER = STATE.parent                          # catalogue/ai-inbox/opencode-recover
ROOT = RECOVER.parent                           # online-shopping-platform/
sys.path.insert(0, str(STATE))
import fetch_evidence as fe                     # shared, unmodified
import gate as gatemod                          # shared, unmodified

ROUND = int(sys.argv[1]) if len(sys.argv) > 1 else 3
ASSIGN = STATE / "chat-assignments" / "chat-07.csv"
LEDGER_OUT = HERE / "chat-07-ledger.csv"
EV_OUT = STATE / f"evidence-chat07-r{ROUND}.json"
LEDGER_HEADER = gatemod.LEDGER_HEADER

# Model designations quoted on the official page this round (verifier-confirmed),
# recorded into detected_model. Applied ONLY if norm(string) occurs in cached page text.
MODEL_FIXES = {
    "7386": "Protectant 300ML",
    "7138": "1201-03510",
    "7331": "Anchor Colour Spray 400ML Clear",
    "7186": "Anchor Standard Black",
    "7153": "Anchor Standard Black",
    "7154": "Anchor Standard Silver",
    "4793": "Toko Yellow Air Hose",
    "107": "WF1660TH",
    "79": "YTT100Z1",
    "200": "MS 172",
    "209": "MS 162",
}

def load_assign():
    with open(ASSIGN, newline="", encoding="utf-8-sig") as fh:
        return {r["source_position"]: r for r in csv.DictReader(fh)}

def load_global_ledger():
    p = STATE / "loop-ledger.csv"
    with open(p, newline="", encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))

def main():
    assign = load_assign()
    gl = load_global_ledger()
    # global duplicate map: first occurrence owns the key
    first_owner = {}
    for r in gl:
        k = (r["item_code"], r["uom"])
        first_owner.setdefault(k, r["source_position"])
    my_positions = set(assign)

    # ---- collect research results ------------------------------------
    batch_meta = {}
    for f in glob.glob(str(HERE / "research" / "batch-*.csv")):
        for r in csv.DictReader(open(f, encoding="utf-8-sig")):
            batch_meta[r["source_position"]] = r
    results = {}
    for f in sorted(glob.glob(str(HERE / "research" / "result-*.csv"))):
        try:
            _rows = list(csv.DictReader(open(f, encoding="utf-8-sig")))
        except Exception as e:
            print("BAD RESULT FILE", f, repr(e), flush=True)
            continue
        for r in _rows:
            pos = r["source_position"]
            old = results.get(pos)
            if old is None or float(r.get("match_confidence") == "high") >= float(old.get("match_confidence") == "high"):
                if old is None or r["researcher_decision"] == "candidate":
                    results[pos] = dict(r)
    verdicts = {}
    for f in sorted(glob.glob(str(HERE / "verify" / "verdict-*.csv"))):
        for r in csv.DictReader(open(f, encoding="utf-8-sig")):
            verdicts[r["source_position"]] = dict(r)
    print(f"results={len(results)} verdicts={len(verdicts)}", flush=True)

    # ---- expand candidates: mirror inside-block duplicate pairs -------
    cands = {p: r for p, r in results.items() if r["researcher_decision"] == "candidate"}
    extra_cands = {}
    for p, r in cands.items():
        k = (assign[p]["item_code"], assign[p]["uom"])
        owner = first_owner.get(k)
        sibs = [q for q in my_positions
                if (assign[q]["item_code"], assign[q]["uom"]) == k and q != p]
        for s in sibs:
            if s not in cands and s not in extra_cands:
                m = dict(r)
                m["source_position"] = s
                m["notes"] = (r.get("notes", "") + " | mirrored-duplicate-of:" + p).strip(" |")
                extra_cands[s] = m
                # blind verdict attaches to the product, not the listing: inherit it
                if p in verdicts:
                    vv = dict(verdicts[p])
                    vv["justification"] = "inherited-from-dup-parent:" + p + " " + vv.get("justification", "")
                    verdicts[s] = vv
    cands.update(extra_cands)
    print(f"candidates incl dup-mirror={len(cands)}: {sorted(cands)}", flush=True)

    # ---- authoritative evidence fetch ---------------------------------
    ev_all = {}
    if EV_OUT.exists():
        try:
            ev_all = json.loads(EV_OUT.read_text(encoding="utf-8"))
        except Exception:
            ev_all = {}
    lock = threading.Lock()
    def _pagecache_healthy(pos):
        f = RECOVER / "pagecache" / f"{pos}.txt"
        if not f.exists():
            return False
        try:
            t = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return False
        return len(t) >= 3000 and "checkingyourbrowser" not in gatemod.norm_text(t[:6000])
    def _ev_healthy(ev):
        return bool(ev) and ev.get("page_status") == 200 and ev.get("image_status") == 200 \
            and int(ev.get("image_bytes_len") or 0) >= 20000
    def do_fetch(pos):
        r = cands[pos]
        p_url = r["official_product_page"].strip()
        i_url = r["official_image_url"].strip()
        old = ev_all.get(pos)
        if _ev_healthy(old) and _pagecache_healthy(pos) \
                and (old.get("page_final_url") or "") == p_url \
                and (old.get("image_final_url") or "").split("?")[0] == i_url.split("?")[0]:
            return pos, old  # reuse healthy evidence, never clobber with a bot-wall shell
        last = {}
        import time as _t
        for attempt in range(3):
            try:
                ev = fe.fetch_row(pos, p_url, i_url)
            except Exception as e:
                ev = {"page_status": -1, "image_status": -1, "error": repr(e)}
            ev["fetched_round"] = ROUND
            last = ev
            if ev.get("page_status") != 200 or _pagecache_healthy(pos):
                break
            _t.sleep(5 * (attempt + 1))  # bot-wall: back off and retry
        with lock:
            prev = ev_all.get(pos)
            # keep whichever evidence set is healthier
            if _ev_healthy(prev) and not (_ev_healthy(last) and _pagecache_healthy(pos)):
                ev_all[pos] = dict(prev, superseded_attempt=ROUND)
            else:
                ev_all[pos] = last
        return pos, ev_all[pos]
    with ThreadPoolExecutor(max_workers=40) as ex:
        futs = [ex.submit(do_fetch, p) for p in cands]
        for i, f in enumerate(as_completed(futs)):
            print("fetched", f.result()[0], flush=True)
    EV_OUT.write_text(json.dumps(ev_all), encoding="utf-8")
    print("evidence written", len(ev_all), flush=True)

    # ---- in-block hash/url collisions across different keys -----------
    sha_rows, url_rows = defaultdict(set), defaultdict(set)
    for p in cands:
        e = ev_all.get(p) or {}
        sha = e.get("image_sha256") or ""
        url = (cands[p]["official_image_url"] or "").strip().lower()
        k = (assign[p]["item_code"], assign[p]["uom"])
        if sha:
            sha_rows[sha].add((p, k))
        if url:
            url_rows[url].add((p, k))
    colliding = set()
    for sha, members in sha_rows.items():
        keys = {k for _, k in members}
        if len(keys) > 1:
            colliding |= {p for p, _ in members}
    for url, members in url_rows.items():
        keys = {k for _, k in members}
        if len(keys) > 1:
            colliding |= {p for p, _ in members}

    # ---- local gate replication + ledger assembly ----------------------
    out_rows = []
    hashes_rows = []
    counts = defaultdict(int)
    for pos in assign:
        ar = assign[pos]
        res = results.get(pos)
        lr = {c: "" for c in LEDGER_HEADER}
        lr.update({
            "source_position": pos, "item_code": ar["item_code"], "uom": ar["uom"],
            "display_name": ar["display_name"], "category": ar["category"],
            "detected_brand": ar.get("detected_brand", ""), "detected_model": ar.get("detected_model", ""),
            "state": "open", "round_first_seen": "3", "round_last_touched": "",
            "tiers_tried": ar.get("ledger_tiers_tried", ""), "rights_status": "unknown",
            "researcher_decision": "", "verifier_verdict": "", "machine_gate": "",
        })
        seed = f"seed: action={ar.get('action','').replace('|','/')}; prior_decision={ar.get('prior_decision','')}"
        log = ""
        tiers_add = []
        if res:
            log = f"{res.get('queries_log','')} | {res.get('pages_log','')}".strip(" |")
            tiers_add = [t for t in (res.get("tiers_run", "").split("|")) if t.isdigit()]
            lr["researcher_decision"] = res["researcher_decision"]
            lr["round_last_touched"] = str(ROUND)
            lr["tiers_tried"] = "|".join(sorted(set(filter(None, ar.get("ledger_tiers_tried", "").split("|") + tiers_add))))
        if res and res["researcher_decision"] != "candidate":
            reason = f"{seed} | r{ROUND}:{res['researcher_decision']} log[{log}]"
            if res.get("notes"):
                reason += f" notes[{res['notes']}]"
            lr["state"] = "open"
            lr["reason"] = reason
            counts["open_" + res["researcher_decision"]] += 1
            out_rows.append(lr)
            continue
        if not res:
            lr["reason"] = seed
            lr["state"] = "open"
            lr["round_last_touched"] = str(ROUND)
            out_rows.append(lr)
            continue
        # candidate path
        v = verdicts.get(pos)
        e = ev_all.get(pos) or {}
        reds = []
        img_url = res["official_image_url"].strip()
        page_url = res["official_product_page"].strip()
        if not page_url or not img_url:
            reds.append(("http", "missing page/image URL"))
        pw, ph = int(e.get("px_w") or 0), int(e.get("px_h") or 0)
        blen = int(e.get("image_bytes_len") or 0)
        ct = (e.get("image_content_type") or "").lower()
        if e.get("page_status") != 200:
            reds.append(("http", f"page status={e.get('page_status')}"))
        if e.get("image_status") != 200:
            reds.append(("http", f"image status={e.get('image_status')}"))
        for what, fin in (("page", e.get("page_final_url", "")), ("image", e.get("image_final_url", ""))):
            low = (fin or "").lower()
            if any(h in low for h in gatemod.BAD_REDIRECT_HINTS):
                reds.append(("http", f"{what} redirect hint: {fin}"))
        if not ct.startswith("image/"):
            reds.append(("content_type", f"content-type={ct or 'missing'}"))
        if max(pw, ph) < 500 or blen < 20000:
            reds.append(("too_small", f"long_edge={max(pw,ph)} bytes={blen}"))
        m = gatemod.THUMB_RE.search(img_url)
        if m and max(int(m.group(1)), int(m.group(2))) < 500 and pw < 500:
            reds.append(("thumbnail_path", f"/{m.group(1)}x{m.group(2)}/ pixels={pw}"))
        from urllib.parse import urlparse
        host = urlparse(img_url).netloc.lower() + " " + urlparse(page_url).netloc.lower()
        if any(bad in host for bad in gatemod.MARKETPLACE_HOSTS):
            reds.append(("marketplace", host.strip()))
        txt_file = RECOVER / "pagecache" / f"{pos}.txt"
        page_text = txt_file.read_text(encoding="utf-8", errors="ignore") if txt_file.exists() else ""
        model_note = ""
        if pos in MODEL_FIXES:
            fix = MODEL_FIXES[pos]
            if gatemod.norm_text(fix) and gatemod.norm_text(fix) in gatemod.norm_text(page_text):
                lr["detected_model"] = fix
                model_note = f" model-string-from-page[{fix}]"
            else:
                reds.append(("model_absent", f"MODEL_FIX '{fix}' not found in page text - refused"))
        if not gatemod.model_present(lr, page_text):
            reds.append(("model_absent", f"variants {gatemod.model_variants(lr)[:3]} absent"))
        if pos in colliding:
            reds.append(("shared_image/hash_collision", "same bytes/url claimed by different item_key in block"))
        # duplicate-parent rule: child gated requires owner gated
        k = (ar["item_code"], ar["uom"])
        owner = first_owner.get(k)
        is_child = owner and owner != pos
        if is_child and owner not in cands and owner not in my_positions:
            reds.append(("duplicate_parent", f"owner position {owner} outside block and open"))
        # ---- normalise verdict fields (some verifiers append prose) ----
        def _yn(x):
            t = (x or "").strip().lower()
            if t.startswith("yes"):
                return "yes"
            if t.startswith("no"):
                return "no"
            return t
        if v:
            vv2 = dict(v)
            vt = (v.get("verifier_verdict", "") or "").strip().lower()
            vv2["verifier_verdict"] = "pass" if vt.startswith("pass") else ("fail" if vt.startswith("fail") else vt)
            vv2["model_exact"] = _yn(v.get("model_exact", ""))
            vv2["finish_exact"] = _yn(v.get("finish_exact", ""))
            v = vv2
        if v and v["verifier_verdict"].strip().lower() == "pass":
            if (v.get("model_exact", "") or "").lower() != "yes":
                reds.append(("schema", "verifier model_exact!=yes"))
            if (v.get("finish_exact", "") or "").lower() not in ("yes", "na"):
                reds.append(("schema", "verifier finish_exact invalid"))
        else:
            reds.append(("verifier_missing_or_fail",
                         "no blind verifier pass yet" if not v else f"verifier said {v['verifier_verdict']}"))
        lr["official_product_page"] = page_url
        lr["official_image_url"] = img_url
        lr["image_px_w"], lr["image_px_h"], lr["image_bytes"] = str(pw), str(ph), str(blen)
        lr["image_sha256"] = e.get("image_sha256", "")
        lr["finish_exact"] = (v.get("finish_exact", "") if v else "")
        lr["model_exact"] = (v.get("model_exact", "") if v else "")
        if v and v.get("finish_exact", "") == "na":
            # verifier could not confirm colour/finish from pixels: honest open,
            # gate demands literal finish_exact=yes for verified_pass
            reds.append(("finish_indeterminate", "verifier returned finish_exact=na"))
        lr["uom_assessment"] = "n/a"
        lr["verifier_verdict"] = (v.get("verifier_verdict", "") if v else "")
        evline = f"EVIDENCE: page{e.get('page_status')} img{e.get('image_status')} {pw}x{ph}px {blen}B sha={lr['image_sha256'][:16]}"
        vline = f"verifier[{v.get('justification','')[:200]}]" if v else "verifier[pending]"
        base_reason = f"{seed}{model_note} | r{ROUND}:candidate log[{log} || {evline}] {vline}"
        if is_child:
            base_reason += " action=duplicate_listing"
        if reds:
            lr["state"] = "open"
            lr["machine_gate"] = "red:" + reds[0][0]
            lr["reason"] = base_reason + f" | r{ROUND}:gate-fail red:{reds[0][0]} {reds[0][1]}"
            counts["red_" + reds[0][0]] += 1
        else:
            lr["state"] = "verified_pass"
            lr["machine_gate"] = "green-local"
            lr["match_confidence"] = res.get("match_confidence", "")
            lr["human_action"] = "n/a"
            lr["reason"] = base_reason
            counts["verified_pass_new"] += 1
        hashes_rows.append([pos, ar["item_code"], ar["uom"], img_url,
                            lr["image_sha256"], pw, ph, blen])
        out_rows.append(lr)

    with open(LEDGER_OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
        w.writeheader()
        w.writerows(out_rows)
    with open(HERE / "hashes.csv", "a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if fh.tell() == 0:
            w.writerow(["source_position", "item_code", "uom", "official_image_url",
                        "image_sha256", "image_px_w", "image_px_h", "image_bytes"])
        w.writerows(hashes_rows)
    # next-round queue: still-open positions
    with open(HERE / f"round{ROUND + 1}-open.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["source_position", "item_code", "uom", "display_name", "state",
                    "tiers_tried", "last_red"])
        n_open = 0
        for lr in out_rows:
            if lr["state"] == "verified_pass":
                continue
            n_open += 1
            w.writerow([lr["source_position"], lr["item_code"], lr["uom"], lr["display_name"],
                        lr["state"], lr["tiers_tried"], lr.get("machine_gate", "")])
    print(json.dumps(dict(counts), indent=1))
    print(f"ledger rows={len(out_rows)} open_next={n_open}")

if __name__ == "__main__":
    main()
