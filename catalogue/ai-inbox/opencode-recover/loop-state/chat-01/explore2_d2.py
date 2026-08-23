#!/usr/bin/env python3
"""Round-2 exploration for D2: map galleries->models, dealer listings, size pages."""
import re
import sys
from pathlib import Path
from urllib.parse import urlparse, unquote

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parents[0]
PC = RECOVER / "pagecache"
sys.path.insert(0, str(RECOVER))
from fetch_evidence import http_get, decode_body  # noqa: E402

OUT = []
def say(s=""):
    OUT.append(s)
    print(s)

# ---------- 1. grep JLL / SMJ dumps ----------
for f in ("sitemapproducts-www_jllelectrical_com_my.txt",
          "sitemapproducts-smjelectrical_com_my.txt"):
    p = HERE / f
    if not p.exists():
        continue
    lines = [l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    say(f"\n### {f} urls={len(lines)}")
    from collections import Counter
    pat = Counter()
    for l in lines[:200]:
        m = re.search(r"\?(ws=[a-z]+)", l)
        if m:
            pat[m.group(1)] += 1
    say(f"  first-url={lines[0][:120]}")
    hits = [u for u in lines if re.search(
        r"megaman|yta[67]0|yta65|ytp38|ytp45|mqtl|scg400|blind.?rivet|fibre.?disc|upvc", u, re.I)]
    say(f"  keyword hits={len(hits)}")
    for u in hits[:60]:
        say(f"  HIT {unquote(u)[:160]}")
    # sample of showproducts urls
    sp = [u for u in lines if "showproducts" in u]
    say(f"  showproducts total={len(sp)}; samples:")
    for u in sp[:8]:
        say(f"    {unquote(u)[:160]}")

# ---------- 2. Megaman gallery -> model mapping ----------
for slugfile in ("mega-led-g-a-bulb.html", "mega-led-stick.html", "mega-eye-ball.html"):
    p = PC / slugfile
    if not p.exists():
        continue
    txt = p.read_text(encoding="utf-8")
    say(f"\n### gallerymap {slugfile}")
    # split around each wp-content img; look +/-600 chars context for YTA/YTP/MQTL codes
    for m in re.finditer(r"https://megaman\.com\.my/wp-content/uploads/[^\"']+\.(?:jpg|png)", txt):
        u = m.group(0)
        if "-100x100" in u or "-300x" in u or "-600x600" in u or "LOGO" in u:
            continue
        ctx = txt[max(0, m.start() - 800):m.end() + 800]
        codes = sorted(set(re.findall(r"(?:YT[A-Z]\d+[A-Z]?\d*|MQTL\d+|A60|A65|A70)", ctx)))
        ccts = sorted(set(re.findall(r"[36][05]00\s*K", ctx)))
        watts = sorted(set(re.findall(r"\b\d+\s*W\b", ctx)))
        say(f"  IMG {u}")
        if codes or ccts or watts:
            say(f"      ctx-codes={codes} ccts={ccts} watts={watts}")

# ---------- 3. Unimech UPVC size pages ----------
for slug in ("upvc-pipe", "upvc-pipe-2", "pvc-pipe"):
    u = f"https://unimechengineering.com.my/product/{slug}/"
    st, fin, ct, body = http_get(u, timeout=25)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st == 200 and body:
        txt = decode_body(body)
        (PC / f"unimech-{slug}.html").write_text(txt, encoding="utf-8")
        title = re.search(r"<title>(.*?)</title>", txt, re.S)
        say(f"  title={title.group(1).strip()[:120] if title else ''}")
        for sz in ("40MM", "32MM", "1 1/2", "1 1/4", "BS5255", "BS 5255", "BS4255", "6 meter", "6M"):
            if sz.lower() in txt.lower():
                i = txt.lower().index(sz.lower())
                say(f"  SIZE-HIT {sz!r}: ...{re.sub(r'<[^>]+>', ' ', txt[max(0,i-80):i+80])}...")
                break
        for m in re.finditer(r"<img[^>]+src=[\"']([^\"']+uploads[^\"']+\.(?:jpg|png|webp))[\"']", txt):
            say(f"  IMG {m.group(1)[:150]}")

# ---------- 4. mrmarks sibling grit products ----------
for pid in ("2160706", "2160712"):
    u = f"https://www.mrmarks.com/index.php?ws=showproducts&products_id={pid}"
    st, fin, ct, body = http_get(u, timeout=30)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st == 200 and body:
        txt = decode_body(body)
        (PC / f"mrmark-{pid}.html").write_text(txt, encoding="utf-8")
        t = re.search(r"<title>(.*?)</title>", txt, re.S)
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", txt, re.S)
        og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
        say(f"  title={t.group(1).strip()[:130] if t else ''}")
        say(f"  h1={re.sub('<[^>]+>', '', h1.group(1)).strip()[:130] if h1 else ''}")
        say(f"  og={og.group(1)[:150] if og else ''}")

# category listing: ourproducts
u = "https://www.mrmarks.com/index.php?ws=ourproducts"
st, fin, ct, body = http_get(u, timeout=30)
say(f"\n### p:{u} status={st} bytes={len(body)}")

# ---------- 5. techplas sitemap children ----------
st, _, _, body = http_get("https://techplas.com.my/sitemap.xml", timeout=25)
if st == 200 and body:
    kids = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(body))
    say(f"\n### q:sitemap:techplas.com.my children={kids}")
    allurls = []
    for k in kids:
        st2, _, _, b2 = http_get(k, timeout=30)
        if st2 == 200 and b2:
            locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b2))
            allurls.extend(locs)
            say(f"  child {k} -> {len(locs)} urls")
            for loc in locs:
                if "fao" in loc.lower() or "flapper" in loc.lower():
                    say(f"  HIT {loc}")
    (HERE / "sitemap-techplas-all.txt").write_text("\n".join(allurls), encoding="utf-8")

# ---------- 6. sonic rivet variants ----------
p = PC / "sonic-rivet.html"
if p.exists():
    txt = p.read_text(encoding="utf-8")
    say("\n### sonic-rivet variants")
    for m in re.finditer(r"(Blind Rivet[^<]{0,60})", txt):
        say(f"  VAR {m.group(1).strip()[:90]}")
    opts = sorted(set(re.findall(r"<option[^>]*>([^<]+)</option>", txt)))
    say(f"  options={opts[:30]}")

# ---------- 7. stanley kit probes ----------
for cand in ("scg400d2-b1", "scg400d1-b1", "scg400-b1"):
    u = f"https://my.stanleytools.global/product/{cand}/"
    st, fin, ct, body = http_get(u, timeout=25)
    ok = st == 200 and body and b"Page Not Found" not in body[:4000]
    say(f"\n### probe p:{u} status={st} final={fin} bytes={len(body)} looks_live={ok}")
    if ok:
        txt = decode_body(body)
        t = re.search(r"<title>(.*?)</title>", txt, re.S)
        og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
        say(f"  title={t.group(1).strip()[:130] if t else ''}")
        say(f"  og={og.group(1)[:150] if og else ''}")

Path(__file__).with_name("finds2-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds2-d2.txt")
