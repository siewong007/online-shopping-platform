#!/usr/bin/env python3
"""D2 round-3c: edaran sitemap, JLL/SMJ search probes, mrmark grit options,
sonic/unimech sitemap greps, dead-domain liveness."""
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parents[0]
CACHE = HERE / "cache-d2"
sys.path.insert(0, str(RECOVER))
from fetch_evidence import http_get, decode_body  # noqa: E402

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

# ---------- 1. edaran.my ----------
st, _, _, body = http_get("https://edaran.my/robots.txt", timeout=20)
say(f"### edaran robots status={st}")
queue = []
if st == 200 and body:
    txt = decode_body(body)
    say("   " + txt[:200].replace("\n", " | "))
    queue = [l.split(":", 1)[1].strip() for l in txt.splitlines()
             if l.lower().startswith("sitemap:")]
if not queue:
    queue = ["https://edaran.my/sitemap.xml", "https://edaran.my/wp-sitemap.xml",
             "https://edaran.my/sitemap_index.xml"]
allurls = []
seen = set()
for sm in queue[:6]:
    st2, _, _, b2 = http_get(sm, timeout=30)
    if st2 != 200 or not b2:
        continue
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b2))
    kids = [l for l in locs if l.endswith(".xml")]
    say(f"### q:sitemap:{sm} urls={len(locs)} children={len(kids)}")
    if kids and not [l for l in locs if "/product/" in l]:
        for k in kids[:10]:
            if k in seen:
                continue
            seen.add(k)
            st3, _, _, b3 = http_get(k, timeout=30)
            if st3 == 200 and b3:
                lu = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b3))
                allurls.extend(lu)
        continue
    allurls.extend(locs)
mega = [u for u in allurls if re.search(r"megaman|yta|ytp", u, re.I)]
say(f"### edaran total={len(allurls)} megaman-hits={len(mega)}")
for u in mega[:60]:
    say(f"  HIT {u}")

# ---------- 2. JLL search endpoint probes ----------
for pat in ("https://www.jllelectrical.com.my/search/keyword/yta60z1/",
            "https://www.jllelectrical.com.my/index.php?ws=search&keyword=yta60z1",
            "https://www.jllelectrical.com.my/searchproduct/yta60z1"):
    st, fin, ct, body = http_get(pat, timeout=20)
    hit = st == 200 and body and re.search(rb"yta60", body, re.I)
    say(f"\n### probe {pat} status={st} bytes={len(body)} mentions_yta60={bool(hit)}")

# ---------- 3. unimech sitemap grep ----------
sys.path.insert(0, str(HERE))
urls = []
rp = HERE.parent / ".."
st, _, _, body = http_get("https://unimechengineering.com.my/wp-sitemap.xml", timeout=25)
kids = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(body)) if st == 200 and body else []
for k in kids:
    st2, _, _, b2 = http_get(k, timeout=30)
    if st2 == 200 and b2:
        urls.extend(re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b2)))
say(f"\n### q:sitemap:unimech wp children={len(kids)} total={len(urls)}")
hits = [u for u in urls if re.search(r"upvc|bs5255|bs4255|\.pdf", u, re.I)]
for u in hits[:20]:
    say(f"  HIT {u}")

# ---------- 4. mrmarks 2160710 parse + search probe ----------
st, fin, ct, body = http_get(
    "https://www.mrmarks.com/index.php?ws=showproducts&products_id=2160710", timeout=30)
if st == 200 and body:
    txt = decode_body(body)
    (CACHE / "mrmark-2160710.html").write_text(txt, encoding="utf-8")
    say(f"\n### p:mrmark 2160710 status={st}")
    opts = sorted(set(re.findall(r"<option[^>]*>([^<]+)</option>", txt)))
    say(f"  options={opts[:30]}")
    imgs = sorted(set(re.findall(r"https://cdn\d\.npcdn\.net/image/[^\"'\s>]+", txt)))
    say(f"  npcdn-imgs={len(imgs)}")
    for i in imgs[:8]:
        say(f"  IMG {i[:160]}")
    names = sorted(set(re.findall(r"(MK-WEL-\d+[^<\"]{0,60})", txt)))
    say(f"  mkwel-mentions={names[:12]}")
for pat in ("https://www.mrmarks.com/index.php?ws=showsearch&keyword=fibre+disc",
            "https://www.mrmarks.com/index.php?ws=search&keyword=fibre"):
    st, fin, ct, body = http_get(pat, timeout=25)
    ok = st == 200 and body
    ids = sorted(set(re.findall(r"products_id=(\d+)", decode_body(body)))) if ok else []
    say(f"\n### probe {pat[:80]} status={st} bytes={len(body) if body else 0} ids={ids[:20]}")

# ---------- 5. sonic sitemap grep rivet ----------
st, _, _, body = http_get("https://sonichardware.com.my/robots.txt", timeout=20)
say(f"\n### sonic robots status={st}")
sm = ""
if st == 200 and body:
    m = re.search(r"[Ss]itemap:\s*(\S+)", decode_body(body))
    sm = m.group(1) if m else ""
    say(f"   sitemap={sm}")
if sm:
    st2, _, _, b2 = http_get(sm, timeout=30)
    locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b2)) if st2 == 200 and b2 else []
    riv = [u for u in locs if re.search(r"rivet", u, re.I)]
    say(f"   urls={len(locs)} rivet-hits={riv[:10]}")

# ---------- 6. liveness of listed dealer domains ----------
for d in ("mybigwarehouse.com.my", "esales.com.my", "samajaya.onesyncapp.com",
          "edaran.my"):
    st, fin, ct, body = http_get(f"https://{d}/", timeout=20)
    say(f"\n### live https://{d}/ status={st} final={fin[:70]} bytes={len(body)}")

Path(__file__).with_name("finds5-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds5-d2.txt")
