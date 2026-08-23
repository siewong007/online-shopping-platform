#!/usr/bin/env python3
"""ESC-2: byte-check Sonic full-size product images."""
import sys, hashlib
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get, image_dims

IMGS = {
    "544": ("https://sonichardware.com.my/images/com_hikashop/upload/19__cotton_glove_zs70_815396175.png", "zs70"),
    "816": ("https://sonichardware.com.my/images/com_hikashop/upload/18__cotton_glovoe_b104.png", "b104"),
    "271": ("https://sonichardware.com.my/images/com_hikashop/upload/01_379559507.jpg", "net70"),
    "924": ("https://sonichardware.com.my/images/com_hikashop/upload/12__semi_leather_glove_891gt.jpg", "gt891"),
    "393": ("https://sonichardware.com.my/images/com_hikashop/upload/15__welding_glove_900gt.png", "900gt"),
    "794": ("https://sonichardware.com.my/images/com_hikashop/upload/16__welding_500sp.png", "500sp"),
}
for pos, (u, tag) in IMGS.items():
    st, fin, ct, body = http_get(u, timeout=40)
    pw, ph = image_dims(body) if body and ct.startswith("image/") else (None, None)
    sha = hashlib.sha256(body).hexdigest()[:16] if body else ""
    print(f"{pos} {tag}: status={st} ct={ct} bytes={len(body)} dims={pw}x{ph} sha={sha}")
