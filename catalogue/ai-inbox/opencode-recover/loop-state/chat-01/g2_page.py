#!/usr/bin/env python3
"""Page report: title / og:image / uploaded images. Usage: python g2_page.py <url> [img_filter]"""
import os, re, ssl, sys, urllib.request
os.environ.setdefault("G2_INSECURE", "1")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl._create_unverified_context()

u = sys.argv[1]
flt = sys.argv[2].lower() if len(sys.argv) > 2 else ""
h = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30,
                           context=CTX).read().decode("utf-8", "ignore")
print("URL:", u)
t = re.search(r"<title[^>]*>(.*?)</title>", h, re.S)
print("TITLE:", t.group(1).strip()[:150] if t else "")
og = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', h) or \
     re.search(r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', h)
print("OG:IMG:", og.group(1)[:220] if og else "")
imgs = sorted(set(re.findall(r'https?://[^\s"\'>]+?\.(?:jpg|jpeg|png|webp)', h)))
host = re.match(r'https?://([^/]+)/', u).group(1)
for m in imgs:
    if host in m and (not flt or flt in m.lower()):
        print("IMG:", m[:190])
