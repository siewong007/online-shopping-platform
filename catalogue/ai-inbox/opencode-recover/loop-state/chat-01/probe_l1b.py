#!/usr/bin/env python3
"""Round-2 probes: deka images, sika retry, bosch search variants, panasonic, midea."""
import json, re, ssl, time, urllib.parse, urllib.request, gzip, io

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context(); CTX.check_hostname = False; CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
    return raw.decode("utf-8", "ignore"), r.status

out = {}

# ---- Deka: extract featured/gallery images ----
for pos, slug in [("627","x-one-46"),("632","koni-54"),("772","koni-54"),("640","concept-mini")]:
    u = f"https://deka.my/{slug}/"
    try:
        html, st = get(u)
        imgs = []
        for m in re.finditer(r'https://deka\.my/wp-content/uploads/[^\s"\')]+?\.(?:png|jpe?g|webp)', html):
            iu = m.group(0)
            if iu not in imgs:
                imgs.append(iu)
        # prefer ones containing slug tokens
        key = slug.split("-")[0]
        pref = [i for i in imgs if key.lower().replace("-","") in i.lower().replace("-","")]
        out[pos] = {"pdp": u, "status": st, "images_top": (pref[:4] or imgs[:6])}
    except Exception as e:
        out[pos] = {"pdp": u, "err": repr(e)[:120]}
    print(pos, str(out[pos])[:300], flush=True)

# ---- Sika retry 2602 + 3630 image hunt ----
for pos, u in [("2602","https://mys.sika.com/en/construction/tile-setting/tile-adhesives/sikaceram-88.html"),
               ("3630","https://mys.sika.com/en/home-improvement/waterproofing/sikagard-703-groutseal.html")]:
    try:
        html, st = get(u)
        og = dict(re.findall(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html) and
                  [("og", m) for m in re.findall(r'property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html)])
        scene7 = sorted(set(re.findall(r'https://sika\.scene7\.com/is/image/[^\s"\'<>?]+', html)))
        out[pos] = {"pdp": u, "status": st, "og_image": og.get("og"), "scene7": scene7[:5]}
    except Exception as e:
        out[pos] = {"pdp": u, "err": repr(e)[:120]}
    print(pos, str(out[pos])[:400], flush=True)

# ---- Bosch OCS search variants ----
def bosch_try(model):
    variants = [
        "https://www.bosch-pt.com.my/my/en/search?text=" + urllib.parse.quote_plus(model),
        "https://www.bosch-pt.com.my/my/en/search/" + urllib.parse.quote_plus(model),
        "https://www.bosch-pt.com.my/my/en/prodsearch?query=" + urllib.parse.quote_plus(model),
    ]
    for v in variants:
        try:
            html, st = get(v)
            if st == 200:
                slugs = sorted(set(re.findall(r'/my/en/([a-z0-9-]{8,90})/', html)))
                return v, st, slugs[:10]
            return v, st, []
        except Exception as e:
            last = repr(e)[:80]
    return variants[0], 0, [last]

for pos, model in [("826","GKS 140"),("950","GDC 140"),("821","GKS 235 Turbo"),("810","GAS 15 PS"),
                   ("856","GRW 140"),("986","GST 90 BE"),("991","GO Gen 3"),("2557","2608521043")]:
    v, st, extra = bosch_try(model)
    hits = [s for s in extra if any(t.lower() in s for t in model.lower().replace("+"," ").split())]
    out[pos] = {"search_url": v, "status": st, "hits_or_slugs": (hits[:6] or extra[:6])}
    print(pos, model, "->", str(out[pos])[:350], flush=True)

json.dump(out, open(BASE + r"\chat-01\serp-L1\probes2.json", "w", encoding="utf-8"), indent=1)
print("saved probes2.json")
