#!/usr/bin/env python3
"""Sitemap greps for Bosch MY, Panasonic MY, Midea MY + Cabana domain probes."""
import re, ssl, urllib.request, gzip, io

UA = {"User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try:
            raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception:
            pass
    return raw.decode("utf-8", "ignore"), r.status

def urls_from_sitemap(xml):
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml)

PATS = {
    "bosch": ["gks-140", "gks140", "gdc-140", "gdc140", "gks-235", "gas-15", "grw-140",
              "grw140", "gst-90", "gst90", "go-gen-3", "2608521043", "2608-521-043"],
    "pana_fan": ["f-m14dzvbkh"],
    "pana_iron": ["ni-317"],
    "midea": ["mrm18010bdg", "mrm18010"],
}

def crawl_sitemap(root, pats, max_subs=12):
    hits = {}
    try:
        xml, st = get(root)
    except Exception as e:
        print("ROOT FAIL", root, repr(e)[:100]); return hits
    locs = urls_from_sitemap(xml)
    subs = [u for u in locs if u.endswith(".xml")][:max_subs]
    print("root", root, "status", st, "locs", len(locs), "subs", len(subs))
    def scan(text, src):
        low = text.lower()
        for p in pats:
            if p in low:
                for line in re.findall(r"<loc>[^<]*" + re.escape(p) + r"[^<]*</loc>", text, re.I):
                    hits.setdefault(p, set()).add(line[5:-6])
    scan(xml, root)
    for s in subs:
        try:
            x2, st2 = get(s)
            scan(x2, s)
            print("  sub", s.split("/")[-1], len(urls_from_sitemap(x2)), flush=True)
        except Exception as e:
            print("  sub fail", s, repr(e)[:80], flush=True)
    return {k: sorted(v)[:8] for k, v in hits.items()}

print("== BOSCH ==")
h = crawl_sitemap("https://www.bosch-pt.com.my/my/en/sitemap.xml", PATS["bosch"])
for k, v in h.items(): print(k, v)

print("== PANASONIC ==")
h = crawl_sitemap("https://www.panasonic.com/my/sitemap.xml", PATS["pana_fan"] + PATS["pana_iron"])
for k, v in h.items(): print(k, v)

print("== MIDEA ==")
h = crawl_sitemap("https://midea.com.my/sitemap.xml", PATS["midea"])
for k, v in h.items(): print(k, v)

print("== CABANA domain probes ==")
for dom in ["https://cabana.com.my/", "https://www.cabana.com.my/", "https://cabanafaucet.com/",
            "https://cabana.my/", "https://cabanasanitary.com/"]:
    try:
        _, st = get(dom, timeout=15)
        print(dom, "->", st)
    except Exception as e:
        print(dom, "-> FAIL", repr(e)[:90])
