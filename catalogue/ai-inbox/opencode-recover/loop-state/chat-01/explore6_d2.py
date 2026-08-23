#!/usr/bin/env python3
"""D2 round-3d: JLL search enumeration per Megaman model token; edaran WP search;
mrmarks 12300/P120 search + category links."""
import re
import sys
from pathlib import Path
from urllib.parse import unquote

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parents[0]
CACHE = HERE / "cache-d2"
sys.path.insert(0, str(RECOVER))
from fetch_evidence import http_get, decode_body  # noqa: E402

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

TOKENS = ["yta60z1", "yta70z1", "yta65z2", "ytp38b1", "ytp38z1", "ytp45z1",
          "mqtl2048", "ytp45z1%203000k", "yta70z1%203000k"]

for tok in TOKENS:
    u = f"https://www.jllelectrical.com.my/search/keyword/{tok}/"
    st, fin, ct, body = http_get(u, timeout=30)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st != 200 or not body:
        continue
    txt = decode_body(body)
    (CACHE / f"jllsearch-{tok.replace('%20', '_')}.html").write_text(txt, encoding="utf-8")
    # result blocks: link + anchor/title text
    items = {}
    for m in re.finditer(
            r"<a[^>]+href=[\"'](https?://www\.jllelectrical\.com\.my/showproducts/productid/\d+/[^\"']*)[\"'][^>]*>(.*?)</a>",
            txt, re.S):
        href, inner = m.group(1), re.sub(r"<[^>]+>", " ", m.group(2))
        pid = re.search(r"productid/(\d+)", href).group(1)
        label = " ".join(inner.split())[:90]
        if pid not in items or len(label) > len(items[pid]):
            items[pid] = label
    for pid, label in sorted(items.items()):
        say(f"  R {pid}  {unquote(label)}")

# ---------- edaran WP search ----------
for tok in ("yta60z1", "yta70z1", "ytp45z1", "ytp38z1", "ytp38b1"):
    u = f"https://edaran.my/?s={tok}"
    st, fin, ct, body = http_get(u, timeout=25)
    hits = []
    if st == 200 and body:
        hits = sorted(set(re.findall(
            r"https://edaran\.my/product/[^\"]+", decode_body(body))))[:10]
    say(f"\n### p:{u} status={st} bytes={len(body)} hits={len(hits)}")
    for h in hits:
        say(f"  HIT {unquote(h)[:150]}")

# ---------- mrmarks ----------
u = "https://www.mrmarks.com/index.php?ws=showsearch&keyword=12300"
st, fin, ct, body = http_get(u, timeout=30)
say(f"\n### p:{u} status={st} bytes={len(body)}")
if st == 200 and body:
    txt = decode_body(body)
    (CACHE / "mrmark-search-12300.html").write_text(txt, encoding="utf-8")
    for m in re.finditer(r"showproducts&products_id=(\d+)[^>]*>\s*([^<]{0,90})", txt):
        say(f"  R {m.group(1)} {m.group(2).strip()[:80]}")

p = CACHE / "mrmark-2160710.html"
if p.exists():
    txt = p.read_text(encoding="utf-8")
    cats = sorted(set(re.findall(
        r"index\.php\?(?:ws=showcategory[^\"'\s]*|cid=\d+[^\"'\s]*)", txt)))
    say(f"\n### mrmark 2160710 cat-links={cats[:12]}")
    rel = sorted(set(re.findall(r"showproducts&products_id=(\d+)", txt)))
    say(f"### mrmark 2160710 related-ids={rel}")

Path(__file__).with_name("finds6-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds6-d2.txt")
