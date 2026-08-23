#!/usr/bin/env python3
"""Explore dealer/OEM sources for D2 SKUs. Writes findings to chat-01/finds-d2.txt."""
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parents[1]
PC = RECOVER / "pagecache"
sys.path.insert(0, str(HERE.parents[0]))
from fetch_evidence import http_get, decode_body  # noqa: E402

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

TOKENS = ["yta60z1", "yta70z1", "yta65z2", "ytp38b1", "ytp38z1", "ytp45z1", "mqtl2048"]

def sitemap_urls(domain: str, cap: int = 60000):
    urls, seen_sm, queue = [], set(), []
    st, _, _, body = http_get(f"https://{domain}/robots.txt", timeout=20)
    if st == 200 and body:
        for line in decode_body(body).splitlines():
            if line.lower().startswith("sitemap:"):
                queue.append(line.split(":", 1)[1].strip())
    if not queue:
        queue = [f"https://{domain}/sitemap.xml", f"https://{domain}/wp-sitemap.xml"]
    while queue and len(urls) < cap:
        sm = queue.pop(0)
        if sm in seen_sm:
            continue
        seen_sm.add(sm)
        st, _, _, body = http_get(sm, timeout=30)
        if st != 200 or not body:
            continue
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(body))
        for loc in locs:
            if loc.endswith(".xml") or "sitemap" in urlparse(loc).path.lower():
                if len(queue) < 80:
                    queue.append(loc)
            else:
                urls.append(loc)
    return urls

# ---------- 1. JLL + SMJ sitemaps, grep Megaman tokens ----------
for dom in ("www.jllelectrical.com.my", "smjelectrical.com.my"):
    say(f"\n### q:sitemap:{dom}")
    urls = sitemap_urls(dom)
    say(f"urls={len(urls)}")
    hits = [u for u in urls if any(t in u.lower() for t in TOKENS)]
    for u in hits[:40]:
        say(f"  HIT {u}")
    (HERE / f"sitemapproducts-{dom.replace('.', '_')}.txt").write_text(
        "\n".join(urls), encoding="utf-8")

# ---------- 2. Megaman MY galleries ----------
for slug in ("led-g-a-bulb", "led-stick", "eye-ball"):
    u = f"https://megaman.com.my/product/{slug}/"
    st, fin, ct, body = http_get(u, timeout=25)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st == 200 and body:
        txt = decode_body(body)
        (PC / f"mega-{slug}.html").write_text(txt, encoding="utf-8")
        # every img with alt
        for m in re.finditer(r"<img[^>]+>", txt):
            tag = m.group(0)
            src = re.search(r"src=[\"']([^\"']+)[\"']", tag)
            alt = re.search(r"alt=[\"']([^\"']*)[\"']", tag)
            if src and "wp-content/uploads" in src.group(1):
                say(f"  IMG {src.group(1)}  alt={alt.group(1) if alt else ''}")

# ---------- 3. Unimech UPVC ----------
say("\n### q:sitemap:unimechengineering.com.my grep upvc")
urls = sitemap_urls("unimechengineering.com.my")
say(f"urls={len(urls)}")
for u in urls:
    if "upvc" in u.lower() or "pipe" in u.lower():
        say(f"  HIT {u}")

# ---------- 4. Stanley global SCG400 ----------
say("\n### q:sitemap:my.stanleytools.global grep scg/sc200/sb202")
urls = sitemap_urls("my.stanleytools.global")
say(f"urls={len(urls)}")
for u in urls:
    lu = u.lower()
    if "scg400" in lu or "grinder" in lu:
        say(f"  HIT {u}")

# ---------- 5. mrmarks.com ----------
say("\n### q:sitemap:mrmarks.com")
urls = sitemap_urls("www.mrmarks.com")
say(f"urls={len(urls)}")
for u in urls[:30]:
    say(f"  {u}")

st, fin, ct, body = http_get(
    "https://www.mrmarks.com/index.php?ws=showproducts&products_id=2160710", timeout=30)
say(f"\n### p:mrmarks 2160710 status={st} bytes={len(body)}")
if st == 200 and body:
    txt = decode_body(body)
    (PC / "mrmark-2160710.html").write_text(txt, encoding="utf-8")
    for m in re.finditer(r"showproducts&products_id=(\d+)", txt):
        pass
    pids = sorted(set(re.findall(r"products_id=(\d+)", txt)))
    say(f"  product_ids_on_page={pids[:40]}")
    for m in re.finditer(r"<img[^>]+src=[\"']([^\"']+npcdn[^\"']+)[\"'][^>]*>", txt):
        say(f"  IMG {m.group(1)[:140]}")

# ---------- 6. techplas retry ----------
for path in ("/sitemap.xml", "/wp-sitemap.xml", "/sitemap_index.xml", "/robots.txt",
             "/products/parts-of-flushing-cistern/flapper-outlet-valve/fao-l110-w"):
    u = f"https://techplas.com.my{path}"
    st, fin, ct, body = http_get(u, timeout=25)
    say(f"\n### p:{u} status={st} ct={ct} bytes={len(body)}")
    if st == 200 and body and path.endswith(("xml", "txt")):
        say("   head: " + decode_body(body)[:300].replace("\n", " "))

# ---------- 7. sonic rivet page ----------
st, fin, ct, body = http_get(
    "https://sonichardware.com.my/product/product/1442-jaguar-blind-rivet", timeout=25)
say(f"\n### p:{fin} status={st} bytes={len(body)}")
if st == 200 and body:
    txt = decode_body(body)
    (PC / "sonic-rivet.html").write_text(txt, encoding="utf-8")
    for m in re.finditer(r"<img[^>]+src=[\"']([^\"']+)[\"']", txt):
        u2 = m.group(1)
        if "hikashop" in u2 or "upload" in u2:
            say(f"  IMG {u2[:150]}")

Path(__file__).with_name("finds-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds-d2.txt")
