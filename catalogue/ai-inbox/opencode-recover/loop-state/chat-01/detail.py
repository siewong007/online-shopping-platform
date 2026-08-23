import re, urllib.request, ssl, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"}

def detail(url, pats):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=40, context=ctx) as r:
        body = r.read(600000).decode("utf-8", "replace")
    t = re.search(r"<title[^>]*>(.*?)</title>", body, re.S)
    print("URL:", url)
    print("TITLE:", (t.group(1).strip() if t else "?")[:150])
    for prop in ["og:image", "og:title"]:
        m = re.search(r'property="%s"[^>]*content="([^"]+)"' % prop, body) or \
            re.search(r'content="([^"]+)"[^>]*property="%s"' % prop, body)
        if m:
            print(f"{prop}:", m.group(1)[:200])
    imgs = re.findall(r'(?:src|href)="(https?://[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"', body)
    seen = []
    for i in imgs:
        if i not in seen and not re.search(r"logo|icon|sprite|banner", i, re.I):
            seen.append(i)
    for i in seen[:5]:
        print("IMG:", i[:180])
    text = re.sub(r"<script.*?</script>", " ", body, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    hits = 0
    for pat in pats:
        for m in re.finditer(pat, text, re.I):
            s = max(0, m.start() - 100)
            print(f"PROOF[{pat}]: ...{text[s:m.end()+120]}...")
            hits += 1
            if hits >= 10:
                return
        if hits >= 10:
            break
    if hits == 0:
        print("NO PROOF HITS")

pairs = [
 ("https://www.yuanming.com.my/product/morries-uk-plug-travel-adaptor-ms3106n/",
  [r"MS.?3106N", r"MORRIES"]),
 ("https://cimalighting.com.my/product/cielo-gen2-t5-led-batten-2ft-3ft-4ft-10w-14w-18w-sirim-cetificated",
  [r"18W", r"3000K|[Ww]arm\s*[Ww]hite", r"CIELO GEN2", r"SIRIM"]),
]
for u, p in pairs:
    try:
        detail(u, p)
    except Exception as e:
        print("ERR", u, repr(e))
    print("-" * 60)
