#!/usr/bin/env python3
"""chat-09 round-1 fixup: alternate transforms for 4 problem Bosch/KDK images."""
import json, re, sys
from pathlib import Path

MY = Path(__file__).resolve().parent
LOOP = MY.parent
sys.path.insert(0, str(LOOP))
import importlib.util
spec = importlib.util.spec_from_file_location("fe", LOOP / "fetch_evidence.py")
fe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fe)

PC = LOOP.parent / "pagecache"
EV_PATH = MY / "evidence-r1.json"
ev = json.loads(EV_PATH.read_text(encoding="utf-8"))
TARGETS = ["1148", "1522", "1625", "2292"]

def alt_urls(pos, cur):
    """Generate candidate alternates from cached page HTML + transform rules."""
    urls = set()
    txt = ""
    pf = PC / (pos + ".txt")
    if pf.exists():
        txt = pf.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r"https?://[^\s\"'<>]+\.(?:png|jpe?g|webp)", txt, re.I):
        u = m.group(0)
        if any(k in u.lower() for k in ("logo", "icon", "sprite", "placeholder", ".svg")):
            continue
        urls.add(u)
    # transform variants of current url
    base = re.sub(r"/optimized/[^/]+/", "/optimized/full/", cur)
    urls.add(base)
    urls.add(re.sub(r"/optimized/[^/]+/", "/", cur))
    urls.add(re.sub(r"/optimized/\d+x\d+/", "/optimized/1000x1000/", cur))
    return [u for u in urls if u != cur]

def dims_ok(e):
    return (max(int(e.get("px_w") or 0), int(e.get("px_h") or 0)) >= 500
            and int(e.get("image_bytes_len") or 0) >= 20000)

for pos in TARGETS:
    e = ev.get(pos, {})
    cur = e.get("image_final_url") or ""
    tried = []
    best = None
    for u in alt_urls(pos, cur)[:14]:
        st, fin, ct, body = fe.http_get(u)
        pw, ph = fe.image_dims(body) if body else (None, None)
        rec = {"url": u, "status": st, "ct": ct, "pw": pw, "ph": ph, "len": len(body) if body else 0}
        tried.append(rec)
        if st == 200 and ct.startswith("image/") and pw and max(pw, ph) >= 500 and len(body) >= 20000:
            best = rec
            break
        if st == 200 and ct.startswith("image/") and body and best is None and \
                max(pw or 0, ph or 0) > max(int(e.get('px_w') or 0), int(e.get('px_h') or 0)):
            best = rec
    print("---", pos, "current:", cur[:90])
    for t in tried[:8]:
        print("   try:", t["status"], t["pw"], t["ph"], t["len"], t["url"][:95])
    if best and dims_ok({"px_w": best["pw"], "px_h": best["ph"], "image_bytes_len": best["len"]}):
        sha = fe.ext_for(best["ct"], b"x")  # ext only; compute sha from body below
        print("   WINNER:", best["url"][:100], best["pw"], best["ph"], best["len"])
