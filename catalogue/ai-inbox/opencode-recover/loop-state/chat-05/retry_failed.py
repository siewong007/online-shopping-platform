#!/usr/bin/env python3
"""Retry failed fetches using Windows curl.exe (different TLS/UA fingerprint).
Reads evidence-chat05.json, re-fetches every non-green image entry."""
import json, subprocess, hashlib, io, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVID = HERE / "evidence-chat05.json"
ASSETS = HERE.parent.parent / "assets"
CURL = r"C:\Windows\System32\curl.exe"

EXT_BY_CT = {"image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
             "image/webp": ".webp", "image/gif": ".gif", "image/bmp": ".bmp",
             "image/tiff": ".tif", "image/avif": ".avif"}

ev = json.loads(EVID.read_text(encoding="utf-8"))
fixed = []
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
    tmp = ASSETS / f"_tmp_{pos}.bin"
    r = subprocess.run([CURL, "-L", "--max-time", "40", "-A",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "-H", "Accept: image/*,*/*;q=0.8", "-o", str(tmp), "-s", "-S", "-w", "%{http_code} %{content_type} %{url_effective}",
        iurl], capture_output=True, text=True)
    wout = (r.stdout or "").strip().split(" ", 2)
    code = int(wout[0]) if wout and wout[0].isdigit() else 0
    ctype = wout[1] if len(wout) > 1 else ""
    final = wout[2] if len(wout) > 2 else iurl
    data = tmp.read_bytes() if tmp.exists() else b""
    tmp.unlink(missing_ok=True)
    if code == 200 and ctype.startswith("image/") and len(data) >= 1:
        from PIL import Image
        try:
            im = Image.open(io.BytesIO(data))
            w, h = im.size
        except Exception:
            w = h = None
        e["image_status"] = 200
        e["image_final_url"] = final
        e["image_content_type"] = ctype.split(";")[0]
        e["image_bytes_len"] = len(data)
        e["px_w"], e["px_h"] = w, h
        e["image_sha256"] = hashlib.sha256(data).hexdigest()
        ext = EXT_BY_CT.get(e["image_content_type"]) or Path(final.split("?")[0]).suffix.lower() or ".bin"
        (ASSETS / f"{pos}{ext}").write_bytes(data)
        fixed.append(f"{pos}|{w}x{h}|{len(data)}B|{ctype}")
    else:
        e["image_status"] = code or e.get("image_status")
        fixed.append(f"{pos}|FAIL{code}|{ctype}")

EVID.write_text(json.dumps(ev, indent=1), encoding="utf-8")
print("\n".join(fixed) if fixed else "nothing to retry")
