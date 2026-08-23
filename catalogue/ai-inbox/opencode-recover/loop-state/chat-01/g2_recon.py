#!/usr/bin/env python3
import os, re, ssl, urllib.request
os.environ.setdefault("G2_INSECURE", "1")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl._create_unverified_context()

DOMAINS = [
    "https://www.paintmaster.com.my", "https://paintmaster.com.my",
    "https://blimaxtools.com", "https://www.blimax.com.my",
    "https://hardex.my", "https://hardex2u.com", "https://www.hardex.asia",
    "https://mkelectric.com", "https://www.mkelectric.co.uk", "https://mkelectric.com.sg",
    "https://picasaf.com", "https://www.picasaf.com.my",
    "https://sensui.tools", "https://sensuitools.com",
    "https://www.sasaki.co.jp", "https://sasakihorn.com",
    "https://hunterhardware.com.my", "https://www.hunterfasteners.com.my",
    "https://cavallo.world.tmall.com", "https://www.cavallovalves.com",
    "https://www.autosol.de",
]
for d in DOMAINS:
    u = d.rstrip("/") + "/"
    try:
        req = urllib.request.Request(u, headers=UA)
        r = urllib.request.urlopen(req, timeout=15, context=CTX)
        body = r.read(300000).decode("utf-8", "ignore")
        t = re.search(r"<title[^>]*>(.*?)</title>", body, re.S | re.I)
        print(f"{r.status} {d}  TITLE={t.group(1).strip()[:95] if t else ''}")
    except Exception as e:
        print(f"--  {d}  {type(e).__name__}: {str(e)[:60]}")
