import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.5", "Accept-Language": "en-MY,en;q=0.9"}

def get(url):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        return r.status, r.read(500000).decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", url
    except Exception as e:
        return -1, repr(e)[:80], url

# a) cabana CB474 search: extract all anchors w/ context
st, txt, fu = get("https://www.cabana.com.my/index.php/component/virtuemart/results,1-?search=true&Itemid=0&keyword=CB474")
print("CABANA SEARCH", st)
for m in re.finditer(r'(?is)<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', txt):
    href, inner = m.group(1), re.sub(r"<[^>]+>", "", m.group(2)).strip()
    if "CB474" in href.upper() + inner.upper():
        print("   ", href[:130], "|", inner[:60])
imgs = re.findall(r'<img[^>]+src="([^"]*CB474[^"]*)"', txt)
print("  imgs:", imgs[:8])

# b) UNI-T digital multimeters listing
st, txt, fu = get("https://instruments.uni-trend.com/products/digital-multimeters/")
print("UNIT DMM", st, len(txt))
hits = []
for m in re.finditer(r'(?is)<a[^>]+href="([^"]+)"[^>]*>(.{0,120}?)</a>', txt):
    blob = (m.group(1) + " " + m.group(2)).upper()
    if "UT33" in blob:
        hits.append((m.group(1)[:110], re.sub(r"<[^>]+>", " ", m.group(2))[:70]))
for h in hits[:10]:
    print("   ", h)

# c) Bosny spray listing
st, txt, fu = get("https://www.bosny.com/spray/")
print("BOSNY SPRAY", st, len(txt))
z = []
for m in re.finditer(r'(?is)<a[^>]+href="([^"]+)"[^>]*>(.{0,150}?)</a>', txt):
    blob = (m.group(1) + " " + m.group(2))
    if re.search(r"zinc|galvan", blob, re.I):
        z.append((m.group(1)[:100], re.sub(r"<[^>]+>", " ", m.group(2)).strip()[:80]))
for h in z[:12]:
    print("   ", h)

# d) Hager MY homepage -> search endpoint
st, txt, fu = get("https://hager.com/my")
print("HAGER MY", st, fu)
forms = re.findall(r'(?is)<form[^>]*action="([^"]+)"', txt)
print("  forms:", forms[:6])
sl = [l for l in re.findall(r'href="([^"]+)"', txt) if "search" in l.lower()][:6]
print("  search links:", sl)
