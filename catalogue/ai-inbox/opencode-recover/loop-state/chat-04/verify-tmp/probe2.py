import urllib.request, ssl, re

ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def get(url, timeout=60):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")

print("---- HENGWEI image usage ----")
for u in [
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-medium-rough-series",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-medium-series",
    "https://hengweihardware.com/sand-paper/swallow-brand-sand-paper-fine-rough-series",
]:
    try:
        html = get(u)
        hits = sorted(set(re.findall(r'[^"\']*sandpaper[^"\']*\.(?:jpg|png|webp)', html, re.I)))
        p165 = "product-165" in html
        print(u.rsplit("/", 1)[-1], "| product-165:", p165, "| imgs:", hits[:6])
    except Exception as e:
        print(u, "ERR", repr(e))

def search(name, url):
    print("---- SEARCH", name, url)
    try:
        html = get(url, 60)
        # extract result links + titles
        items = re.findall(r'<a[^>]+href="(http[^"]+)"[^>]*>(.*?)</a>', html, re.S)
        n = 0
        seen = set()
        for href, txt in items:
            txt = re.sub(r"<[^>]+>", "", txt)
            txt = re.sub(r"\s+", " ", txt).strip()
            if not txt or len(txt) < 12:
                continue
            low = (href + " " + txt).lower()
            if any(b in low for b in ["duckduckgo.com", "bing.com", "microsoft", "youtube.com"]):
                continue
            if href in seen:
                continue
            seen.add(href)
            print("RESULT:", txt[:120], "|", href[:160])
            n += 1
            if n > 12:
                break
        if n == 0:
            print("NO_PARSED_RESULTS len=", len(html))
            text = re.sub(r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I))
            lines = [re.sub(r"\s+", " ", l).strip() for l in text.split("\n") if l.strip()]
            for ln in lines[:25]:
                print("RAW:", ln[:200])
    except Exception as e:
        print("SEARCH_ERR", repr(e))

search("ddg-hash", "https://html.duckduckgo.com/html/?q=%22163230874531ddf97cb5e0aa10484005dcb2e573b5%22")
search("ddg-name", "https://html.duckduckgo.com/html/?q=%22Swallow+Abrasive+Sand+Paper+80%22")
search("bing-name", "https://www.bing.com/search?q=%22Swallow+Abrasive+Sand+Paper%22+80")
