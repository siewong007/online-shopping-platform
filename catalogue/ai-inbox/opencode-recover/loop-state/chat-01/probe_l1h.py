#!/usr/bin/env python3
import re
import ssl
import urllib.request
import gzip
import io

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def get(url):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=30, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception:
            pass
    return raw.decode("utf-8", "ignore")


for u in [
    "https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-bl-diy-detail",
    "https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-diy-detail",
]:
    h = get(u)
    title = re.search(r"<title>([^<]*)</title>", h, re.I)
    print("PAGE", title.group(1).strip() if title else "")
    imgs = []
    for m in re.finditer(r'(?:src|href)="([^"]+(?:\.jpe?g|\.png|\.webp))"', h, re.I):
        iu = m.group(1)
        if "/templates/" in iu or "favicon" in iu or "font" in iu.lower():
            continue
        if iu not in imgs:
            imgs.append(iu)
    for i in imgs[:12]:
        print("   ", i)
