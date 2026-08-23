#!/usr/bin/env python3
"""Merge raw researcher JSONL outputs into shard-out CSVs (chat-06 local tooling)."""
import csv, json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / "raw"
OUTD = HERE / "shards-out"
OUTD.mkdir(exist_ok=True)

ASSIGN = HERE.parent / "chat-assignments" / "chat-06.csv"
assign = {r["source_position"]: r for r in csv.DictReader(ASSIGN.open(encoding="utf-8"))}

COLS = ["source_position","item_code","uom","display_name","category",
        "detected_brand","detected_model","official_product_page","official_image_url",
        "model_string_in_page","match_confidence","model_exact","finish_exact",
        "queries_run","pages_opened","researcher_decision","reason"]

def load_jsonl(p):
    out=[]
    for ln in p.read_text(encoding="utf-8").splitlines():
        ln=ln.strip()
        if not ln or ln.startswith("#"): continue
        try: out.append(json.loads(ln))
        except json.JSONDecodeError: 
            # tolerate doubled-quote artifacts by retrying with quote fixups
            try:
                fixed=ln.replace('""','"')
                out.append(json.loads(fixed))
            except Exception:
                print(f"WARN unparseable line in {p.name}: {ln[:120]}")
    return out

rows=[]; seen={}
for f in sorted(RAW.glob("w*.jsonl")):
    for rec in load_jsonl(f):
        pos=str(rec.get("source_position",""))
        if not pos: continue
        a=assign.get(pos)
        if a is None:
            print(f"WARN position {pos} from {f.name} not in chat-06 assignment"); continue
        dup=pos in seen
        if dup and seen[pos]!=f.name:
            print(f"WARN duplicate research for pos {pos} ({seen[pos]} vs {f.name}) - keeping first")
            continue
        seen[pos]=f.name
        rows.append({
            "source_position":pos,
            "item_code":a["item_code"],"uom":a["uom"],
            "display_name":a["display_name"],"category":a["category"],
            "detected_brand":rec.get("detected_brand","")or a.get("detected_brand",""),
            "detected_model":rec.get("detected_model","")or a.get("detected_model",""),
            "official_product_page":rec.get("official_product_page","")or"",
            "official_image_url":rec.get("official_image_url","")or"",
            "model_string_in_page":rec.get("model_string_in_page","")or"",
            "match_confidence":rec.get("match_confidence","")or"",
            "model_exact":rec.get("model_exact","")or"",
            "finish_exact":rec.get("finish_exact","")or"",
            "queries_run":" | ".join(rec.get("queries_run",[])),
            "pages_opened":" | ".join(rec.get("pages_opened",[])),
            "researcher_decision":rec.get("researcher_decision","")or"",
            "reason":rec.get("reason","")or"",
        })

with (OUTD/"merged-r1.csv").open("w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh,fieldnames=COLS); w.writeheader()
    w.writerows(rows)

cands=[r for r in rows if r["researcher_decision"]=="candidate"]
with (OUTD/"candidates-r1.csv").open("w",newline="",encoding="utf-8") as fh:
    w=csv.DictWriter(fh,fieldnames=COLS); w.writeheader()
    w.writerows(cands)

print(f"merged={len(rows)} candidates={len(cands)}")
