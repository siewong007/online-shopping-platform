#!/usr/bin/env python3
"""Round-5: bosch sitemap grep; cabana category crawl for CB models."""
import re, ssl, urllib.request, gzip, io

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept": "*/*", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try: raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception: pass
    return raw.decode("utf-8", "ignore"), r.status

PATS = ["gks-140","gks140","gdc-140","gdc140","gks-235","gks235","gas-15","gas15","grw-140","grw140",
        "gst-90","gst90","2608521043","2608-521-043","go-gen-3","gogen3","go-3-gen"]

print("== BOSCH sitemap index ==")
try:
    xml, st = get("https://www.bosch-pt.com.my/my/en/sitemaps/sitemap_index_my.xml")
    subs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)
    print("subs:", len(subs))
    hits = {}
    scanned = 0
    for s in subs[:20]:
        try:
            x2, _ = get(s)
            low = x2.lower()
            n = 0
            for p in PATS:
                if p in low:
                    ms = [m[:-6] for m in re.findall(r"<loc>[^<]*</loc>", x2, re.I)
                          if any(pp in m.lower() for pp in [p])]
                    if ms:
                        hits.setdefault(p, []).extend(ms[:5])
                        n += 1
            scanned += 1
            print(" ", s.split("/")[-1], "len", len(x2), "pat_hits", n, flush=True)
        except Exception as e:
            print(" fail", s.split("/")[-1], repr(e)[:70])
    for k, v in hits.items():
        print(k, sorted(set(v))[:4])
except Exception as e:
    print("bosch index FAIL", repr(e)[:120])

print()
print("== CABANA categories ==")
cats = [
    "/index.php/products/bathroom/basin-tap",
    "/index.php/products/bathroom/bidet",
    "/index.php/products/bathroom/bathroom-accessories/angle-valve",
]
# also discover more category slugs
try:
    home, _ = get("https://cabana.com.my/")
    allc = sorted(set(l for l in re.findall(r'href="(/index\.php/products[^"]*)"', home)))
    cats = allc
    print("categories:", len(cats))
except Exception as e:
    print("home FAIL", repr(e)[:80])

MODELS = ["CB6331", "CB2807", "CB91SS", "CB65SS", "CB90SS", "CB2805A", "CB2806A"]
found = {}
for c in cats:
    url = "https://cabana.com.my" + c.replace("&amp;", "&")
    try:
        h, st = get(url)
    except Exception as e:
        continue
    for m in MODELS:
        if m.upper() in h.upper():
            # find product link near it
            idxs = [mm.start() for mm in re.finditer(m.upper(), h.upper())][:3]
            ctx_snips = []
            for i in idxs:
                seg = h[max(0, i-400):i+400]
                ls = re.findall(r'href="([^"]+)"', seg)
                ctx_snips.extend(ls[-2:])
            found.setdefault(m, {"cat": c, "hrefs": sorted(set(ctx_snips))[:4]})
for k, v in found.items():
    print(k, v)
