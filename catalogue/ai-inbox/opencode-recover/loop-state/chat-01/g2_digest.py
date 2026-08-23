#!/usr/bin/env python3
"""Digest serps.json: flag results whose title/url actually contains the model token."""
import json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(BASE, "serp-G2", "serps.json"), encoding="utf-8"))
for pos, rec in sorted(d.items(), key=lambda kv: kv[1]["ord"]):
    qm = rec["qm"]
    toks = [t for t in re.findall(r"[A-Za-z0-9]{3,}", qm) if not re.fullmatch(r"\d+", t)]
    toks = [t for t in toks if t.lower() not in ("and", "the", "for", "inch")]
    found = []
    for q in rec["queries"]:
        for t, u in q["results"]:
            blob = (t + " " + u)
            hit_toks = [x for x in toks if x.lower() in blob.lower()]
            strong = len(hit_toks) >= min(2, len(toks))
            my = ".my/" in u or ".my" in u
            if strong or (my and len(hit_toks) >= 1):
                found.append((q["q"][:40], t[:70], u[:110], my))
    if found:
        print("=" * 10, pos, rec["brand"], "|", qm)
        seen = set()
        for qq, t, u, my in found[:6]:
            k = u.split("?")[0]
            if k in seen:
                continue
            seen.add(k)
            print(f"    [{qq}] {t} | {u}")
