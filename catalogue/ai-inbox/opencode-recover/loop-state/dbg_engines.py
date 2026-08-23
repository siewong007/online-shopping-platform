import re, sys, urllib.parse, urllib.request
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
q = urllib.parse.quote_plus('"Eupro" "1920" fishing hook')
for name, u in [
    ("ddg-lite", "https://lite.duckduckgo.com/lite/?q=" + q),
    ("mojeek", "https://www.mojeek.com/search?q=" + q),
    ("ecosia", "https://www.ecosia.org/search?q=" + q),
]:
    try:
        h = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20).read().decode("utf-8", "ignore")
        links = re.findall(r'href="(https?://[^"]+)"', h)
        links = [l for l in links if not any(d in l for d in ("duckduckgo", "mojeek", "ecosia", "bing.", "brave"))]
        print(name, len(h), "ext-links:", len(links))
        for l in links[:4]:
            print("   ", l[:110])
    except Exception as e:
        print(name, "ERR", repr(e)[:80])
