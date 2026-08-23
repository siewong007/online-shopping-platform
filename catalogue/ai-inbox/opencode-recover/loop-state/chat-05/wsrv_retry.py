#!/usr/bin/env python3
"""Second-chance fetch for non-green images via wsrv.nl image CDN passthrough."""
import json, urllib.request, urllib.parse, hashlib, io
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVID = HERE / "evidence-chat05.json"
ASSETS = HERE.parents[2] / "assets"   # catalogue/ai-inbox/assets

EXT_BY_CT = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
             "image/webp": ".webp", "image/gif": ".gif"}

ev = json.loads(EVID.read_text(encoding="utf-8"))
out = []
for pos in sorted(ev, key=lambda p: int(p) if p.isdigit() else 10**9):
    e = ev[pos]
    iurl = e.get("image_url") or ""
    if not iurl:
        continue
    ct = e.get("image_content_type") or ""
    ok = (e.get("image_status") == 200 and ct.startswith("image/")
          and (e.get("image_bytes_len") or 0) >= 20000
          and max(e.get("px_w") or 0, e.get("px_h") or 0) >= 500)
    if ok:
        continue
    prox = "https://wsrv.nl/?url=" + urllib.parse.quote(iurl, safe="") + "&w=1400"
    try:
        req = urllib.request.Request(prox, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
            ctype = (resp.headers.get("Content-Type") or "").split(";")[0]
            final = resp.geturl()
        if not ctype.startswith("image/") or len(data) < 2000:
            raise ValueError(f"not an image: {ctype} {len(data)}B")
    except Exception as ex:
        out.append(f"{pos}|WSRV-ERR {type(ex).__name__}")
        continue
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        w, h = im.size
    except Exception:
        w = h = None
    e["image_status"] = 200
    e["image_final_url"] = final
    e["image_content_type"] = ctype
    e["image_bytes_len"] = len(data)
    e["px_w"], e["px_h"] = w, h
    e["image_sha256"] = hashlib.sha256(data).hexdigest()
    ext = EXT_BY_CT.get(ctype) or ".jpg"
    (ASSETS / f"{pos}{ext}").write_bytes(data)
    out.append(f"{pos}|{w}x{h}|{len(data)}B|{ctype}")

EVID.write_text(json.dumps(ev, indent=1), encoding="utf-8")
print("\n".join(out) if out else "nothing retried")
