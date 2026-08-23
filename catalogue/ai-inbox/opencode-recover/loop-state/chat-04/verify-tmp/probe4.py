import urllib.request, ssl, re, json

ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def get(url, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")

def bing(name, q):
    print("---- BING", name)
    try:
        html = get("https://www.bing.com/search?q=" + urllib.parse.quote(q))
    except Exception as e:
        print("ERR", repr(e))
        return
    algos = re.findall(r'<li class="b_algo".*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a></h2>(.*?)</li>', html, re.S)
    if not algos:
        print("NO_ORGANIC_RESULTS")
        return
    for href, t, rest in algos[:10]:
        t = re.sub(r"<[^>]+>", "", t)
        snippet = re.sub(r"<[^>]+>", " ", rest)
        snippet = re.sub(r"\s+", " ", snippet).strip()[:220]
        print("R:", t.strip()[:110], "|", href[:140])
        print("   S:", snippet)

bing("loose-name", '"Swallow Abrasive Sand Paper"')
bing("hash", "163230874531ddf97cb5e0aa10484005dcb2e573b5")
bing("npcdn-swallow", "npcdn swallow abrasive")

print("---- npcdn.net root")
for u in ["https://npcdn.net/", "http://www.npcdn.net/"]:
    try:
        html = get(u)
        t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        print(u, "->", (re.sub(r"\s+", " ", t.group(1)).strip()[:150] if t else "?"), "| len:", len(html))
        text = re.sub(r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I))
        lines = [re.sub(r"\s+", " ", l).strip() for l in text.split("\n") if len(l.strip()) > 20]
        for ln in lines[:8]:
            print("   RAW:", ln[:170])
    except Exception as e:
        print(u, "ERR", repr(e)[:130])

print("---- INNOVEST structure")
for u in ["https://innovestengineering.com/robots.txt", "https://innovestengineering.com/sitemap.xml"]:
    try:
        txt = get(u)
        print(u, "\n", txt[:900])
    except Exception as e:
        print(u, "ERR", repr(e)[:120])
try:
    html = get("https://innovestengineering.com/")
    scripts = re.findall(r'src="([^"]+\.js[^"]*)"', html)
    print("SCRIPTS:", scripts[:10])
    hrefs = sorted(set(re.findall(r'href="(/[^"#]*)"', html)))
    print("HREFS:", [h for h in hrefs if not h.endswith((".css", ".ico"))][:40])
    m = re.findall(r'(api\.[a-z]+|/api/[a-zA-Z0-9_/\-]+)', html)
    print("API-ish:", sorted(set(m))[:20])
except Exception as e:
    print("HOME ERR", repr(e)[:130])

print("---- SUPABASE list attempt")
try:
    req = urllib.request.Request("https://api.innovestengineering.com/storage/v1/object/list/media",
                                 data=json.dumps({"prefix": "media/Swallow"}).encode(),
                                 headers={"User-Agent": UA["User-Agent"], "Content-Type": "application/json"})
    r = urllib.request.urlopen(req, timeout=45, context=ctx)
    print("LIST STATUS", r.status)
    print(r.read().decode()[:3000])
except Exception as e:
    print("LIST ERR", repr(e)[:200])
