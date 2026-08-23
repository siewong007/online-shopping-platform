import urllib.request, urllib.parse, re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml"}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=18) as r:
        return r.status, r.read().decode("utf-8", "ignore")

# 1) probe theleedenstore search
for q in ["996060809", "DW4785"]:
    try:
        st, h = get("https://www.theleedenstore.com.my/catalogsearch/result/?q=" + urllib.parse.quote(q))
        print("leeden", q, st, len(h))
        prods = re.findall(r'<a[^>]*href="(https://www\.theleedenstore\.com\.my/[^"]+\.html)"[^>]*>', h)
        print("  hits:", list(dict.fromkeys(prods))[:5])
    except Exception as e:
        print("leeden ERR", q, repr(e)[:100])

# 2) retouch.my sitemap index
try:
    st, h = get("https://www.retouch.my/sitemap.xml")
    print("retouch sitemap", st, len(h))
    print(re.findall(r"<loc>([^<]+)</loc>", h)[:15])
except Exception as e:
    print("retouch ERR", repr(e)[:120])
