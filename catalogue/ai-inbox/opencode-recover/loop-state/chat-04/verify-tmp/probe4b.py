import urllib.request, ssl, re, json, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ctx = ssl._create_unverified_context()
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def get(url, timeout=45):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=ctx).read().decode("utf-8", "replace")

print("---- INNOVEST structure")
try:
    html = get("https://innovestengineering.com/")
    scripts = re.findall(r'src="([^"]+\.js[^"]*)"', html)
    print("SCRIPTS:", scripts[:10])
    hrefs = sorted(set(re.findall(r'href="(/[^"#]*)"', html)))
    print("HREFS:", [h for h in hrefs if not h.endswith((".css", ".ico"))][:40])
    api = sorted(set(re.findall(r'(/api/[a-zA-Z0-9_/\-.]+)', html)))
    print("API-ish:", api[:20])
except Exception as e:
    print("HOME ERR", repr(e)[:150])

for u in ["https://innovestengineering.com/robots.txt", "https://innovestengineering.com/sitemap.xml"]:
    try:
        txt = get(u)
        print(u, "->\n", txt[:1200])
    except Exception as e:
        print(u, "ERR", repr(e)[:130])

print("---- common search endpoints")
for u in [
    "https://innovestengineering.com/search?q=swallow",
    "https://innovestengineering.com/products?search=swallow",
    "https://innovestengineering.com/shop?search=swallow",
]:
    try:
        html = get(u)
        low = html.lower()
        print(u, "| len:", len(html), "| has swallow:", "swallow" in low)
        if "swallow" in low:
            idxs = [m.start() for m in re.finditer(r"swallow", low)][:6]
            for i in idxs:
                seg = re.sub(r"<[^>]+>", " ", html[max(0, i-200):i+300])
                print("   CTX:", re.sub(r"\s+", " ", seg).strip()[:220])
    except Exception as e:
        print(u, "ERR", repr(e)[:130])

print("---- SUPABASE list attempt")
for url, data in [("https://api.innovestengineering.com/storage/v1/object/list/media", b'{"prefix":"Swallow"}'),
                  ("https://api.innovestengineering.com/storage/v1/object/list/media/Swallow", b'{"prefix":""}')]:
    try:
        req = urllib.request.Request(url, data=data,
                                     headers={"User-Agent": UA["User-Agent"], "Content-Type": "application/json"})
        r = urllib.request.urlopen(req, timeout=45, context=ctx)
        body = r.read().decode()[:4000]
        print("LIST OK", url, r.status)
        try:
            arr = json.loads(body)
            names = [x.get("name") for x in arr if isinstance(x, dict)]
            print("FILES(%d):" % len(names))
            for nme in names:
                if "sand" in nme.lower() or "paper" in nme.lower():
                    print("  ", nme)
        except Exception:
            print(body[:1500])
    except Exception as e:
        print("LIST ERR", url, repr(e)[:200])

print("---- DDG lite retry")
try:
    html = get("https://lite.duckduckgo.com/lite/?q=%22Swallow+Abrasive+Sand+Paper%22")
    links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>(.*?)</a>', html, re.S)
    if not links:
        links = re.findall(r'<a[^>]+rel="nofollow"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S)
    for href, t in links[:12]:
        t = re.sub(r"<[^>]+>", "", t)
        print("DDG:", re.sub(r"\s+", " ", t).strip()[:110], "|", href[:150])
except Exception as e:
    print("DDG ERR", repr(e)[:160])
