import urllib.request, ssl, re

ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def get(url, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")

def links(name, url, pat=None):
    print("---- ", name)
    try:
        html = get(url)
    except Exception as e:
        print("ERR", repr(e))
        return
    items = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
    n = 0
    seen = set()
    for href, txt in items:
        txt = re.sub(r"<[^>]+>", "", txt)
        txt = re.sub(r"\s+", " ", txt).strip()
        if not txt:
            continue
        if any(b in href.lower() for b in ["mojeek.com", "bing.com", "microsoft", "wikipedia", "youtube", ".css", ".js"]):
            continue
        if href in seen:
            continue
        seen.add(href)
        print("R:", txt[:110], "|", href[:150])
        n += 1
        if n > 12:
            break
    if n == 0:
        text = re.sub(r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I))
        lines = [re.sub(r"\s+", " ", l).strip() for l in text.split("\n") if len(l.strip()) > 25]
        for ln in lines[:15]:
            print("RAW:", ln[:180])

links("MOJEEK-swallow80", "https://www.mojeek.com/search?q=%22Swallow+Abrasive+Sand+Paper%22")
links("MOJEEK-npcdn", "https://www.mojeek.com/search?q=npcdn.net+swallow+sandpaper")
links("BING-exact", "https://www.bing.com/search?q=%22Swallow+Abrasives+Sand+Paper+80%22")
links("BING-innovex", "https://www.bing.com/search?q=innovex+%22sand+paper%22+swallow")

print("---- CDN headers")
req = urllib.request.Request("https://cdn1.npcdn.net/image/163230874531ddf97cb5e0aa10484005dcb2e573b5.jpg?md5id=8c9ce62eb00bfc39549c0b3cbe197ceb&new_width=100&new_height=100&w=-62170009200", headers={"User-Agent": UA["User-Agent"]})
try:
    r = urllib.request.urlopen(req, timeout=45, context=ctx)
    print(dict(r.headers))
except Exception as e:
    print("HDR ERR", repr(e))

for d in ["https://www.innovex.com.my/", "http://innovex.com.my/", "https://innovex.com.sg/", "https://www.innovexhardware.com/"]:
    try:
        html = get(d)
        t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        print("DOMAIN OK:", d, "|", re.sub(r"\s+", " ", t.group(1)).strip()[:120] if t else "?")
        low = html.lower()
        for kw in ["swallow", "sand"]:
            print("   has '%s':" % kw, kw in low)
    except Exception as e:
        print("DOMAIN FAIL:", d, repr(e)[:120])
