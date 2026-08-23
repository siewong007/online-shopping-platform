#!/usr/bin/env python3
"""Compact page prober: GET url(s), print status + lines matching patterns."""
import re, sys, urllib.request, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-MY,en;q=0.9"}

def probe(url, pats, maxhits=12):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=30, context=ctx) as r:
            body = r.read(400000).decode("utf-8", "replace")
            ctype = r.headers.get("Content-Type", "")
            code = r.status
            final = r.geturl()
    except Exception as e:
        print(f"P:{url} -> ERR {e!r}")
        return
    print(f"P:{url} -> {code} len={len(body)} ct={ctype} final={final}")
    links = re.findall(r'href="(https?://[^"]*?/product/[^"#?]+)"', body)
    uniq = []
    for l in links:
        if l not in uniq:
            uniq.append(l)
    for l in uniq[:8]:
        print(f"  PRODUCT: {l}")
    if not uniq:
        m = re.search(r"[Nn]o products were found[^<]*", body)
        print(f"  no-product-links; none-found-msg={bool(m)}")
        text = re.sub(r"<[^>]+>", " ", body)
        text = re.sub(r"\s+", " ", text)
        hits = 0
        for pat in pats:
            for mm in re.finditer(pat, text, re.I):
                s = max(0, mm.start() - 80)
                print(f"  HIT[{pat}]: ...{text[s:mm.end()+100]}...")
                hits += 1
                if hits >= 6:
                    break
            if hits >= 6:
                break

if __name__ == "__main__":
    import json
    with open(sys.argv[1], encoding="utf-8") as fh:
        spec = json.load(fh)
    for item in spec:
        probe(item["u"], item["p"])
