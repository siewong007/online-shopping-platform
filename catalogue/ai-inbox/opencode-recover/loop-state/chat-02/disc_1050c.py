import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.5", "Accept-Language": "en-MY,en;q=0.9"}

def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        return r.status, r.read(400000).decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", url
    except Exception as e:
        return -1, repr(e)[:80], url

# 1) Cabana search CB474
u = "https://www.cabana.com.my/index.php/component/virtuemart/results,1-?search=true&Itemid=0&keyword=CB474"
st, txt, fu = get(u)
print("CABANA SEARCH", st, fu)
prods = re.findall(r'href="(/index\.php/products[^"]*)"[^>]*>', txt)
seen = []
for p in prods:
    if p not in seen: seen.append(p)
print("  productlinks:", seen[:15])
m = re.findall(r"(CB474[\w-]*)", txt)
print("  CB474 mentions:", set(m))

# 2) UNI-T trend homepage: find search endpoint
st, txt, fu = get("https://www.uni-trend.com/")
print("UNIT", st)
forms = re.findall(r'(?is)<form[^>]*action="([^"]+)"', txt)
print("  forms:", forms[:6])
slinks = re.findall(r'href="([^"]*(?:search|product)[^"]*)"', txt, re.I)
sseen = []
for l in slinks[:20]:
    if l not in sseen: sseen.append(l)
print("  search/prod links:", sseen[:10])

# 3) Bosny homepage: products/zinc
st, txt, fu = get("https://www.bosny.com/")
zinc = re.findall(r'href="([^"]+)"[^>]*>([^<]{0,60}(?:zinc|galvan|product)[^<]{0,40})', txt, re.I)
print("BOSNY", st, "matches:", zinc[:10])
plinks = []
for l in re.findall(r'href="([^"]+)"', txt, re.I):
    if any(k in l.lower() for k in ["product", "spray"]) and l not in plinks:
        plinks.append(l)
print("  prod links:", plinks[:12])

# 4) Hager country sites
st, txt, fu = get("https://www.hager.com/")
cl = [l for l in re.findall(r'href="([^"]+)"', txt) if "/my" in l.lower()][:8]
print("HAGER my-links:", cl)
