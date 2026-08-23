#!/usr/bin/env python3
"""D2 round-3a: JLL Electrical deep-dive. Fetch known Megaman PDPs, map their own
images, and discover per-CCT sibling listings via on-page links.
Cache goes to chat-01/cache-d2/ (shared pagecache is unstable)."""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parents[0]
CACHE = HERE / "cache-d2"
CACHE.mkdir(exist_ok=True)
sys.path.insert(0, str(RECOVER))
from fetch_evidence import http_get, decode_body  # noqa: E402

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

KNOWN = {
    "134": "https://www.jllelectrical.com.my/showproducts/productid/4013262/cid/544741/megaman-yta60z1",
    "153": "https://www.jllelectrical.com.my/showproducts/productid/4013783/cid/359490/megaman-yta70z1",
    "197": "https://www.jllelectrical.com.my/showproducts/productid/4013283/cid/457883/megaman-yta65z2",
    "138": "https://www.jllelectrical.com.my/showproducts/productid/4013891/cid/424624/megaman-ytp38b1",
    "168174": "https://www.jllelectrical.com.my/showproducts/productid/4013992/cid/592300/megaman-ytp45z1",
    "227": "https://www.jllelectrical.com.my/showproducts/productid/4013850/megaman-ytp38z1-10w-220240",
}

sibling_links = {}

for key, url in KNOWN.items():
    st, fin, ct, body = http_get(url, timeout=30)
    say(f"\n### p:{url} status={st} bytes={len(body)}")
    if st != 200 or not body:
        continue
    txt = decode_body(body)
    (CACHE / f"jll-{key}.html").write_text(txt, encoding="utf-8")
    t = re.search(r"<title>(.*?)</title>", txt, re.S)
    say(f"  title={t.group(1).strip()[:150] if t else ''}")
    og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
    say(f"  og={og.group(1)[:160] if og else ''}")
    # all content images (npcdn/newpages/jll-hosted)
    imgs = []
    for m in re.finditer(r"<img[^>]+src=[\"']([^\"']+)[\"']", txt):
        u = m.group(1)
        if re.search(r"npcdn|newpages|jllelectrical.*(image|upload|products)", u, re.I) \
                and not re.search(r"logo|icon|banner|facebook|whatsapp|payment", u, re.I):
            if u not in imgs:
                imgs.append(u)
    for u in imgs[:12]:
        say(f"  IMG {u[:170]}")
    # sibling product links with megaman-ish slugs
    links = sorted(set(re.findall(
        r"https?://www\.jllelectrical\.com\.my/showproducts/productid/\d+/[^\"'\s>]*", txt)))
    mega = [l for l in links if re.search(r"yta[567]|ytp3|ytp4|megaman", l, re.I)]
    sibling_links[key] = mega
    say(f"  sibling-mega-links={len(mega)}")
    for l in mega[:25]:
        say(f"    L {unq(l) if False else l[:170]}")

say("\n### union sibling candidates")
union = sorted({l for v in sibling_links.values() for l in v})
for l in union:
    say(f"  U {l[:170]}")
(HERE / "jll-siblings.txt").write_text("\n".join(union), encoding="utf-8")

Path(__file__).with_name("finds3a-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds3a-d2.txt")
