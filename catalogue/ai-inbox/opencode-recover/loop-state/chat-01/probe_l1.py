#!/usr/bin/env python3
"""Direct OEM ground-truth probes for shard-L1 SKUs.

For each brand: query the OEM site's own search / known URL patterns,
fetch candidate PDPs, extract og:title + og:image, and HEAD-check image size.
Writes chat-01/serp-L1/probes.json : pos -> {pdp, og_title, og_image, img_bytes, note}
"""
import json, re, ssl, sys, urllib.parse, urllib.request, gzip, io

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Encoding": "gzip"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    try:
        r = urllib.request.urlopen(req, timeout=timeout, context=CTX)
    except urllib.error.HTTPError as e:
        raise
    raw = r.read()
    if r.headers.get("Content-Encoding") == "gzip":
        raw = gzip.GzipFile(fileobj=io.BytesIO(raw)).read()
    return raw, r.status, dict(r.headers)

def suggest_search(host, q):
    """Shopify suggest.json fallback -> [(title, url)]"""
    u = f"https://{host}/search/suggest.json?q=" + urllib.parse.quote_plus(q) + "&resources[type]=product"
    try:
        raw, st, _ = get(u)
        j = json.loads(raw.decode("utf-8", "ignore"))
        items = []
        for p in j.get("resources", {}).get("results", {}).get("products", []):
            items.append([p.get("title", ""), "https://" + host + "/products/" + str(p.get("handle", ""))])
        return u, st, items[:10], ""
    except Exception as e:
        return u, 0, [], repr(e)[:80]

def head_len(url):
    req = urllib.request.Request(url, headers=UA, method="HEAD")
    try:
        r = urllib.request.urlopen(req, timeout=20, context=CTX)
        return int(r.headers.get("Content-Length") or 0), r.status
    except Exception:
        return 0, 0

OG_RE = re.compile(r'<meta[^>]+property=["\']og:(title|image)["\'][^>]+content=["\']([^"\']+)', re.I)
OG_RE2 = re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:(title|image)', re.I)

def og_of(html):
    out = {}
    for m in OG_RE.finditer(html):
        out[m.group(1).lower()] = m.group(2)
    for m in OG_RE2.finditer(html):
        out.setdefault(m.group(2).lower(), m.group(1))
    return out

def shopify_search(host, q):
    """Return list of (title, product_url) from a Shopify search page."""
    url = f"https://{host}/search?q=" + urllib.parse.quote_plus(q)
    try:
        raw, st, _ = get(url)
    except Exception as e:
        s2 = suggest_search(host, q)
        return s2[0], s2[1], s2[2], "html-429;suggest:" + s2[3]
    html = raw.decode("utf-8", "ignore")
    items = []
    for m in re.finditer(r'href="(https?://%s/products/[^"#?]+)"[^>]*>([^<]{3,120})' % re.escape(host), html):
        u, t = m.group(1), m.group(2).strip()
        if [t, u] not in items:
            items.append([t, u])
    if not items:
        for m in set(re.findall(r'(https?://%s/products/[a-z0-9-]+)' % re.escape(host), html)):
            items.append(["", m])
    return url, st, items[:10], ""

def pdp_report(pos, pdp_url):
    ent = {"pdp": pdp_url}
    try:
        raw, st, _ = get(pdp_url)
        html = raw.decode("utf-8", "ignore")
        og = og_of(html)
        ent["status"] = st
        ent["og_title"] = og.get("title", "")[:150]
        img = og.get("image")
        if img:
            img = img.replace("&amp;", "&")
            ent["og_image"] = img
            n, st2 = head_len(img)
            ent["img_bytes_head"] = n
    except Exception as e:
        ent["error"] = repr(e)[:120]
    return ent

def main():
    probes = {}

    # ---- Deka PDPs (slugs seen in nav) ----
    for pos, slug in [("627", "x-one-46"), ("632", "koni-54"), ("772", "koni-54"), ("640", "concept-mini")]:
        probes[pos] = pdp_report(pos, f"https://deka.my/{slug}/")

    # ---- Khind Shopify search per model ----
    khind = {"469": "GC6010", "446": "VC68P", "578": "SPC6", "440": "VC8020MS",
             "442": "HM200", "523": "EI405", "647": "VC8630", "477": "EK502", "522": "MC121"}
    for pos, model in khind.items():
        u, st, items, err = shopify_search("khind.com.my", model)
        probes[pos] = {"search_url": u, "status": st, "items": items, "err": err}
        print(pos, model, st, len(items), err[:60], flush=True)

    # ---- Saniware prior/known PDPs ----
    probes["1202"] = pdp_report("1202", "https://saniware.com/product/sws-304-3977/")
    probes["1440"] = pdp_report("1440", "https://saniware.com/product/sw-ss-av-80-2/")

    # ---- Sika MY PDPs (known from prior pass) ----
    probes["2602"] = pdp_report("2602", "https://mys.sika.com/en/construction/tile-setting/tile-adhesives/sikaceram-88.html")
    probes["3630"] = pdp_report("3630", "https://mys.sika.com/en/home-improvement/waterproofing/sikagard-703-groutseal.html")

    # ---- Bosch PT site search (may be JS; capture anyway) ----
    bosch = {"826": "GKS 140", "950": "GDC 140", "821": "GKS 235 Turbo",
             "810": "GAS 15 PS", "856": "GRW 140", "986": "GST 90 BE",
             "991": "GO Gen 3", "2557": "2608521043"}
    for pos, model in bosch.items():
        u = "https://www.bosch-pt.com.my/my/en/search?searchTerm=" + urllib.parse.quote_plus(model)
        try:
            raw, st, _ = get(u)
            html = raw.decode("utf-8", "ignore")
            slugs = sorted(set(re.findall(r'/my/en/([a-z0-9-]{8,80}-ocs-[a-z]+)/', html)))[:8]
            hits = [s for s in slugs if any(t.lower().replace(" ", "-") in s for t in model.split())]
            probes[pos] = {"search_url": u, "status": st, "slugs": slugs, "model_hits": hits}
        except Exception as e:
            probes[pos] = {"search_url": u, "err": repr(e)[:100]}

    out = BASE + r"\chat-01\serp-L1\probes.json"
    json.dump(probes, open(out, "w", encoding="utf-8"), indent=1)
    for k in sorted(probes, key=int):
        v = probes[k]
        print(k, "->", str(v)[:220], flush=True)
    print("saved", out)

if __name__ == "__main__":
    main()
