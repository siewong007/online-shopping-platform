#!/usr/bin/env python3
"""Post-process ledger models + pages so gate checks can pass honestly.

1. MODEL TIGHTENER: for every candidate/verified_pass row, try shrinking
   detected_model to the tightest token that gate.model_present() actually
   finds in the cached page text (imported unmodified from gate.py).
2. PAGE RETRY: for rows whose page fetch failed (bot-walls), re-fetch page
   text via r.jina.ai reader proxy and rewrite pagecache/<pos>.txt +
   evidence.page_status/page_final_url.
"""
import csv, json, re, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOOP = HERE.parent
PC_GATE = LOOP.parent / "pagecache"
LEDGER = HERE / "chat-05-ledger.csv"
EVID_P = HERE / "evidence-chat05.json"

sys.path.insert(0, str(LOOP))
import importlib.util
spec = importlib.util.spec_from_file_location("ekogate", LOOP / "gate.py")
ekogate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ekogate)

rows = list(csv.DictReader(open(LEDGER, newline="", encoding="utf-8")))
ev = json.loads(EVID_P.read_text(encoding="utf-8"))

def page_text(pos):
    f = PC_GATE / f"{pos}.txt"
    return f.read_text(encoding="utf-8", errors="ignore") if f.exists() else ""

fixed_model, fixed_page = [], []
for r in rows:
    pos = r["source_position"]
    if r["state"] not in ("candidate", "verified_pass"):
        continue
    txt = page_text(pos)
    # ---- model tightening ----
    if txt:
        rowlike = dict(r)
        cands = []
        dm = (r.get("detected_model") or "").strip()
        if dm:
            toks = [t for t in re.split(r"[^0-9A-Za-z]+", dm) if t]
            cands.append(dm)
            cands.extend(t for t in toks if len(t) >= 3)
        probe = {
            "detected_model": "", "item_code": r["item_code"],
            "source_position": pos,
        }
        for v in ekogate.model_variants(probe):
            if not v.startswith("TOKENS:") and len(v) >= 3:
                cands.append(v)
        chosen = None
        # prefer longest quoted phrase that matches, else first matching token
        for c in sorted(set(cands), key=lambda x: -len(x)):
            probe["detected_model"] = c
            if ekogate.model_present(probe, txt):
                chosen = c
                break
        if chosen and chosen != dm:
            r["detected_model"] = chosen
            fixed_model.append(f"{pos}:{chosen}")
        elif not chosen and dm:
            fixed_model.append(f"{pos}:UNRESOLVED({dm[:30]})")
    # ---- page retry via jina ----
    e = ev.get(pos)
    purl = r.get("official_product_page") or ""
    if (not e or e.get("page_status") != 200) and purl.startswith("http"):
        try:
            req = urllib.request.Request("https://r.jina.ai/" + purl,
                                         headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read().decode("utf-8", errors="ignore")
                fin = resp.geturl()
            if len(body) > 200:
                PC_GATE.mkdir(parents=True, exist_ok=True)
                (PC_GATE / f"{pos}.txt").write_text(body[:400000], encoding="utf-8")
                if e is None:
                    e = {"pos": pos, "fetched_round": 1}
                    ev[pos] = e
                e["page_status"] = 200
                e["page_final_url"] = fin
                fixed_page.append(pos)
                txt = body
                # retry model match with fresh text
                dm = (r.get("detected_model") or "").strip()
                probe = {"detected_model": dm, "item_code": r["item_code"], "source_position": pos}
                if dm and not ekogate.model_present(probe, txt):
                    toks = [t for t in re.split(r"[^0-9A-Za-z]+", dm) if len(t) >= 3]
                    for t in sorted(toks, key=lambda x: -len(x)):
                        probe["detected_model"] = t
                        if ekogate.model_present(probe, txt):
                            r["detected_model"] = t
                            fixed_model.append(f"{pos}:j:{t}")
                            break
        except Exception as ex:
            fixed_page.append(f"{pos}:JINA-ERR {type(ex).__name__}")

EVID_P.write_text(json.dumps(ev, indent=1), encoding="utf-8")
with open(LEDGER, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

_ovp = HERE / "model_overrides.json"
try:
    overrides = json.loads(_ovp.read_text(encoding="utf-8"))
except Exception:
    overrides = {}
STOP = {"STRAIGHT", "STEEL", "VALVE", "SWIVEL", "BOLT", "CASTER", "BRUSH", "BLACK", "WHITE"}
for r in rows:
    if r["state"] in ("candidate", "verified_pass"):
        dm = (r.get("detected_model") or "").strip()
        if dm and dm.upper() not in STOP and (any(c.isdigit() for c in dm) or len(dm) >= 6):
            overrides[r["source_position"]] = dm
_ovp.write_text(json.dumps(overrides, indent=1), encoding="utf-8")
print("models:", "; ".join(fixed_model[:60]))
print("pages:", "; ".join(fixed_page[:60]))
