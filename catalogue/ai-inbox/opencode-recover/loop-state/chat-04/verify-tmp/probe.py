import urllib.request, ssl, re, sys

ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")

def probe(name, url, keywords):
    print("=" * 20, name, url)
    try:
        html = get(url)
    except Exception as e:
        print("FETCH_ERROR", repr(e))
        return
    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    if t:
        print("TITLE:", re.sub(r"\s+", " ", t.group(1)).strip()[:300])
    d = re.search(r'<meta name="description" content="(.*?)"', html, re.I | re.S)
    if d:
        print("METADESC:", re.sub(r"\s+", " ", d.group(1)).strip()[:400])
    body = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", "\n", body)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.split("\n")]
    seen = set()
    count = 0
    for ln in lines:
        if not ln or len(ln) < 2:
            continue
        low = ln.lower()
        if any(k.lower() in low for k in keywords):
            key = low[:120]
            if key in seen:
                continue
            seen.add(key)
            print("LINE:", ln[:260])
            count += 1
            if count > 45:
                break

kw_sonic = ["swallow", "grit", "#60", "#80", "#100", "#120", "60", "option"]
probe("SONIC-PDP", "https://sonichardware.com.my/categories-listing/product/1574-swallow-abrasive-sand-paper",
      ["swallow", "grit", "sandpaper", "sand paper", "60", "80", "100", "120"])

for u in [
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-medium-rough-series",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-medium-series",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-fine-rough-series",
]:
    probe("HENGWEI", u, ["swallow", "grit", "series", "rough", "medium", "fine", "sandpaper", "s1", "60", "80", "100", "120", "product-165"])

probe("INNOVEST-HOME", "https://innovestengineering.com/", ["swallow", "sand", "search", "shop", "product"])
