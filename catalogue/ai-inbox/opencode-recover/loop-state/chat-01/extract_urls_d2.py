#!/usr/bin/env python3
"""D2 finalizer step 1: extract full JLL npimg URLs from saved PDP HTML,
emit shard-d2.csv (candidates + pendings)."""
import csv
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CACHE = HERE / "cache-d2"

def full_urls(html_name):
    txt = (CACHE / html_name).read_text(encoding="utf-8")
    og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
    og_u = og.group(1) if og else ""
    # gallery/webp variants of the SAME hash at 1000px
    big = []
    m = re.search(r"/npimg/([0-9a-f]+)\.(?:png|jpg)", og_u)
    if m:
        h = m.group(1)
        for mm in re.finditer(r"https://cdn\d\.npcdn\.net/npimg/" + h +
                              r"\.[a-z]+\?[^\"'\s<)]+", txt):
            u = mm.group(0)
            if "new_width=1000" in u and u not in big:
                big.append(u)
    return og_u, (big[0] if big else "")

PAGES = {
    "134": "jll-134.html",
    "153": "jll-153.html",
    "197": "jll-197.html",
    "138": "jll-138.html",
    "227": "jll-227.html",
    "168174": "jll-168174.html",
}
CANON = {
    "134": "https://www.jllelectrical.com.my/showproducts/productid/4013262/cid/544741/megaman-yta60z1-10w-220240v-e27-810lm-led-gls-bulb-3000k4000k6500k/",
    "153": "https://www.jllelectrical.com.my/showproducts/productid/4013783/cid/359490/megaman-yta70z1-15w-220240v-e27-1350lm-led-gls-bulb-3000k4000k6500k/",
    "197": "https://www.jllelectrical.com.my/showproducts/productid/4013283/cid/457883/megaman-yta65z2-12w-220240v-e27-1080lm-led-gls-bulb-3000k4000k6500k/",
    "138": "https://www.jllelectrical.com.my/showproducts/productid/4013891/cid/424624/megaman-ytp38b1-10w-220240v-810lm-plc-led-stick-3000k4000k6500k/",
    "227": "https://www.jllelectrical.com.my/showproducts/productid/4013850/megaman-ytp38z1-10w-220240v-810lm-e27-led-stick-3000k4000k6500k/",
}
for k in ("134", "153", "197", "138", "227"):
    og, big = full_urls(PAGES[k])
    print(k, "OG:", og[:120])
    print(k, "BIG:", big[:160])
og, big = full_urls("jll-168174.html")
print("168174 OG:", og[:120])
print("168174 BIG:", big[:160])
