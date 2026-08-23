#!/usr/bin/env python3
"""Round-6: bosch nested sitemaps; cabana product pages + searches."""
import re
import ssl
import urllib.request
import gzip
import io

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def getb(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception:
            pass
    return raw, r.status


def get(url, timeout=40):
    b, st = getb(url, timeout)
    return b.decode("utf-8", "ignore"), st


PATS = ["gks-140", "gks140", "gdc-140", "gdc140", "gks-235", "gks235", "gas-15", "gas15",
        "grw-140", "grw140", "gst-90", "gst90", "2608521043", "2608-521-043"]

print("== BOSCH nested ==")
base = "https://www.bosch-pt.com.my/my/en/sitemaps/"
for name in ["products-sitemaps.xml", "ocs-products-sitemaps.xml"]:
    try:
        raw, st = getb(base + name)
        txt = raw.decode("utf-8", "ignore")
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", txt)
        print(name, st, "len", len(txt), "locs", len(locs), locs[:3])
        hits = {}
        checked = 0
        for u in locs[:40]:
            try:
                x, _ = get(u)
                low = x.lower()
                checked += 1
                for p in PATS:
                    if p in low:
                        ms = [l[:-6] for l in re.findall(r"<loc>[^<]*</loc>", x) if p in l.lower()]
                        hits.setdefault(p, []).extend(ms[:5])
            except Exception:
                pass
        print(" checked", checked, "files")
        for k, v in hits.items():
            print(" ", k, sorted(set(v))[:4])
    except Exception as e:
        print(name, "FAIL", repr(e)[:100])

print()
print("== CABANA ==")


def probe(u):
    try:
        h, st = get(u)
        title = re.search(r"<title>([^<]*)</title>", h, re.I)
        og = re.search(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)', h, re.I)
        print(st, u.split("cabana.com.my")[-1][:70], "| title:", (title.group(1).strip()[:70] if title else ""), "| og:", bool(og))
        return h
    except Exception as e:
        print("FAIL", u.split("cabana.com.my")[-1][:70], repr(e)[:80])
        return ""


probe("https://cabana.com.my/index.php/products/bathroom/bidet/cb91ss-bl-diy-detail")
probe("https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-diy-detail")
probe("https://cabana.com.my/index.php/products/bathroom/bidet/cb90ss-bl-diy-detail")

h = probe("https://cabana.com.my/index.php/products/bathroom/basin-tap")
if h:
    items = sorted(set(re.findall(r'href="(/index\.php/products/[^"]*detail)"', h)))
    print("basin-tap details:", len(items))
    for i in items[:30]:
        print("   ", i)

for q in ["CB6331", "CB2807", "CB2805A", "CB2806A", "CB65SS"]:
    su = f"https://cabana.com.my/component/search/?searchword={q}&ordering=&searchphrase=all"
    hh = probe(su)
    if hh:
        ls = sorted(set(re.findall(r'href="(/index\.php/products/[^"]*)"', hh)))[:6]
        print("   search links:", ls)
