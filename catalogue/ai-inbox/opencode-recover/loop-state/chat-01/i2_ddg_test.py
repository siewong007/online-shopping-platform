import urllib.request, urllib.parse, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
q = "Mr Mark SSE-919 safety spectacles Malaysia"

def try_url(url):
    try:
        req = urllib.request.Request(url, headers=UA)
        with urllib.request.urlopen(req, timeout=20) as r:
            h = r.read().decode("utf-8", "ignore")
        return len(h), h
    except Exception as e:
        return 0, repr(e)

for name, url in [
    ("ddg-html", "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(q)),
    ("ddg-lite", "https://lite.duckduckgo.com/lite/?q=" + urllib.parse.quote(q)),
]:
    n, h = try_url(url)
    print("==", name, n)
    if n:
        titles = re.findall(r'class="result__a"[^>]*>(.*?)</a>', h, re.S)[:6] or re.findall(r"<a[^>]*class=['\"]result-link['\"][^>]*>(.*?)</a>", h, re.S)[:6]
        urls = re.findall(r'href="(https?://duckduckgo\.com/l/\?uddg=[^"]+|https?://[^"]+)"', h)[:6]
        print(re.sub(r"<[^>]+>", "", str(titles))[:400])
        print(str(urls)[:600])
