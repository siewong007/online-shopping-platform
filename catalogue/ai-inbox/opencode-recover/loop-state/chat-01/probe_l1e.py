#!/usr/bin/env python3
"""Round-4: bosch robots->sitemap; cabana catalogue probe; midea structure."""
import re, ssl, urllib.request, gzip, io

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.8", "Accept-Encoding": "gzip", "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=30):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip" or raw[:2] == b"\x1f\x8b":
        try: raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
        except Exception: pass
    return raw.decode("utf-8", "ignore"), r.status

print("== BOSCH robots ==")
for u in ["https://www.bosch-pt.com.my/robots.txt"]:
    try:
        t, st = get(u); print(u, st); print(t[:800])
    except Exception as e:
        print(u, "FAIL", repr(e)[:90])

print("== CABANA home ==")
html, st = get("https://cabana.com.my/")
print("status", st, "len", len(html))
links = sorted(set(re.findall(r'href="(/[^"#]*?)"', html)))
prods = [l for l in links if "product" in l.lower()]
print("nav sample:", links[:15])
print("product-ish:", prods[:25])
cbhits = sorted(set(re.findall(r'\bCB[0-9A-Za-z-]{2,12}\b', html)))
print("CB tokens on homepage:", cbhits[:30])
# search endpoint guesses
for q in ["CB6331", "CB2807"]:
    for su in [f"https://cabana.com.my/?s={q}", f"https://cabana.com.my/search?q={q}",
               f"https://cabana.com.my/products?search={q}"]:
        try:
            h2, st2 = get(su)
            found = sorted(set(re.findall(r"href=\"([^\"]*" + q + r"[^\"]*)\"", h2)))[:5]
            print(su, st2, "len", len(h2), "links-with-model:", found)
            if st2 == 200 and len(h2) > 5000:
                break
        except Exception as e:
            print(su, "FAIL", repr(e)[:80])

print("== MIDEA ==")
try:
    xml, st = get("https://midea.com.my/sitemap.xml")
    print("sitemap head:", xml[:300].replace("\n", " "))
except Exception as e:
    print("sitemap FAIL", repr(e)[:80])
for su in ["https://midea.com.my/?s=MRM18010BDG",
           "https://midea.com.my/?post_type=product&s=MRM18010BDG",
           "https://www.midea.com/my/search?q=MRM18010BDG"]:
    try:
        h3, st3 = get(su)
        f3 = sorted(set(re.findall(r"href=\"([^\"]*mrm18010[^\"]*)\"", h3, re.I)))[:5]
        print(su, st3, "len", len(h3), "mrm-links:", f3)
    except Exception as e:
        print(su, "FAIL", repr(e)[:80])
