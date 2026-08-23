import sys, os, re, socket
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

# --- pos 5343 image: HE4252
img_urls = [
    "https://cdn1.npcdn.net/image/1559617303032d525f8842aae59a0bd22e9ff6f836.png?md5id=ec97b3455d25310a00e49c9abf0633a1&new_width=1200&new_height=1200&size=max&w=1567133447",
    "http://web.archive.org/web/20260519012539im_/https://cdn1.npcdn.net/image/1559617303032d525f8842aae59a0bd22e9ff6f836.png?md5id=ec97b3455d25310a00e49c9abf0633a1&new_width=1000&new_height=1000&size=max&w=1567133447",
]
for iu in img_urls:
    ev = F.fetch_image("5343", iu)
    print("5343", {k: ev.get(k) for k in ("image_status", "px_w", "px_h", "image_bytes_len", "image_final_url")})
    if ev.get("px_w", 0) >= 500:
        break

# --- find HE4251 products_id from archived category page
def cdx(params):
    u = "http://web.archive.org/cdx/search/cdx?" + params
    raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read().decode("utf-8", "ignore")
    import json
    return json.loads(raw)

import urllib.request
rows = cdx("url=hardexworld.com*&output=json&limit=800&filter=original:.*REPAIR-MAINTENANCE.*ws%3Dshowcat.*&collapse=urlkey")
for r in rows:
    if isinstance(r, list) and len(r) > 2:
        print(r[1], r[2][:140])
