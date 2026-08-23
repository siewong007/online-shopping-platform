#!/usr/bin/env python3
"""D2 round-3b: megaman gallery->CCT mapping + unimech/mrmarks/techplas/sonic/stanley."""
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

# ---------- 1. megaman galleries ----------
for slug in ("led-g-a-bulb", "led-stick", "eye-ball"):
    u = f"https://megaman.com.my/product/{slug}/"
    st, fin, ct, body = http_get(u, timeout=25)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st != 200 or not body:
        continue
    txt = decode_body(body)
    (CACHE / f"mega-{slug}.html").write_text(txt, encoding="utf-8")
    for m in re.finditer(r"https://megaman\.com\.my/wp-content/uploads/[^\"']+?\.(?:jpg|png)", txt):
        u2 = m.group(0)
        if re.search(r"-100x100|-300x|-600x600|LOGO", u2):
            continue
        ctx = txt[max(0, m.start() - 1200):m.end() + 1200]
        codes = sorted(set(re.findall(r"YT[A-Z]\d{2}[A-Z]?\d?", ctx)))
        ccts = sorted(set(re.findall(r"[36][05]00\s*K", ctx)))
        heads = sorted(set(re.findall(r"<h[23][^>]*>([^<]{3,60})</h[23]>", ctx)))
        say(f"  IMG {u2}")
        say(f"      codes={codes} ccts={ccts} heads={[h.strip()[:40] for h in heads][:6]}")

# ---------- 2. unimech ----------
for slug in ("upvc-pipe", "upvc-pipe-2", "pvc-pipe"):
    u = f"https://unimechengineering.com.my/product/{slug}/"
    st, fin, ct, body = http_get(u, timeout=25)
    say(f"\n### p:{u} status={st} bytes={len(body)}")
    if st != 200 or not body:
        continue
    txt = decode_body(body)
    (CACHE / f"unimech-{slug}.html").write_text(txt, encoding="utf-8")
    t = re.search(r"<title>(.*?)</title>", txt, re.S)
    say(f"  title={t.group(1).strip()[:120] if t else ''}")
    low = txt.lower()
    for sz in ("40mm", "32mm", '1 1/2', '1 1/4', "bs5255", "bs 5255", "bs4255", "6 meter"):
        i = low.find(sz)
        if i >= 0:
            frag = re.sub(r"<[^>]+>", " ", txt[max(0, i - 100):i + 120])
            say(f"  SIZE {sz!r}: ...{' '.join(frag.split())[:160]}...")
            break
    og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
    say(f"  og={og.group(1)[:150] if og else ''}")
    for m in re.finditer(r"<img[^>]+src=[\"']([^\"']*uploads[^\"']+\.(?:jpg|png|webp))[\"']", txt):
        v = m.group(1)
        if not re.search(r"logo|icon", v, re.I):
            say(f"  IMG {v[:150]}")

# ---------- 3. mrmarks siblings ----------
for pid in ("2160706", "2160712"):
    u = f"https://www.mrmarks.com/index.php?ws=showproducts&products_id={pid}"
    st, fin, ct, body = http_get(u, timeout=30)
    say(f"\n### p:mrmark {pid} status={st} bytes={len(body)}")
    if st == 200 and body:
        txt = decode_body(body)
        (CACHE / f"mrmark-{pid}.html").write_text(txt, encoding="utf-8")
        t = re.search(r"<title>(.*?)</title>", txt, re.S)
        og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
        say(f"  title={t.group(1).strip()[:140] if t else ''}")
        say(f"  og={og.group(1)[:150] if og else ''}")

# ---------- 4. techplas ----------
st, _, _, body = http_get("https://techplas.com.my/sitemap.xml", timeout=25)
kids = []
if st == 200 and body:
    kids = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(body))
say(f"\n### q:sitemap:techplas children={len(kids)} {kids[:6]}")
for k in kids:
    st2, _, _, b2 = http_get(k, timeout=30)
    if st2 == 200 and b2:
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", decode_body(b2))
        hits = [l for l in locs if re.search(r"fao|flapper", l, re.I)]
        say(f"  child {k.rsplit('/', 2)[-2] if k.endswith('/') else k[-40:]} urls={len(locs)} hits={hits}")

u = "https://techplas.com.my/products/parts-of-flushing-cistern/flapper-outlet-valve/fao-l110-w"
st, fin, ct, body = http_get(u, timeout=25)
if st == 200 and body:
    txt = decode_body(body)
    (CACHE / "techplas-fao.html").write_text(txt, encoding="utf-8")
    og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
    say(f"\n### p:{u}\n   og={og.group(1) if og else ''}")
    for m in re.finditer(r"<img[^>]+src=[\"']([^\"']*uploads[^\"']+\.(?:jpg|png|webp))[\"'][^>]*>", txt):
        v = m.group(1)
        if re.search(r"fao|flapper|l110", v, re.I):
            say(f"  IMG {v[:150]}")

# ---------- 5. sonic rivet ----------
p = CACHE / "sonic-rivet.html"
st, fin, ct, body = http_get(
    "https://sonichardware.com.my/product/product/1442-jaguar-blind-rivet", timeout=25)
if st == 200 and body:
    p.write_bytes(body)
txt = decode_body(p.read_bytes()) if p.exists() else ""
if txt:
    say("\n### sonic rivet variants")
    opts = sorted(set(re.findall(r"<option[^>]*>([^<]+)</option>", txt)))
    say(f"  options={opts[:24]}")

# ---------- 6. stanley kit probes ----------
for cand in ("scg400d2-b1", "scg400d1-b1"):
    u = f"https://my.stanleytools.global/product/{cand}/"
    st, fin, ct, body = http_get(u, timeout=25)
    live = st == 200 and body and b"Page Not Found" not in body[:6000]
    say(f"\n### probe {cand} status={st} live={live} final={fin[:90]}")
    if live and body:
        txt = decode_body(body)
        t = re.search(r"<title>(.*?)</title>", txt, re.S)
        og = re.search(r"property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", txt)
        say(f"  title={t.group(1).strip()[:130] if t else ''}")
        say(f"  og={og.group(1)[:150] if og else ''}")

Path(__file__).with_name("finds3b-d2.txt").write_text("\n".join(OUT), encoding="utf-8")
print("\nwrote finds3b-d2.txt")
