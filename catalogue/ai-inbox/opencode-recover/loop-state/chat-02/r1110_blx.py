import sys, socket, re, json, urllib.request
socket.setdefaulttimeout(45)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.read(1500000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:70]

# blimax search results page structure
st, h = get("https://www.blimax.com.my/search/hole+saw")
print("blimax /search/:", st, len(h))
prods = sorted(set(re.findall(r'href="(https://www\.blimax\.com\.my/product/[^"]+)"', h)))
print("product links:", len(prods))
for p in prods[:20]:
    print("   ", p[:120])
if not prods:
    # maybe products listed under /our-products/<cat>/<sub>/<slug>
    prods = sorted(set(re.findall(r'href="(https://www\.blimax\.com\.my/our-products/[^"]+)"', h)))
    print("our-products links:", len(prods))
    for p in prods[:20]:
        print("   ", p[:130])

def cdx(pattern, limit=80):
    u = ("http://web.archive.org/cdx/search/cdx?url=" + urllib.parse.quote(pattern, safe="")
         + "&output=json&limit=" + str(limit) + "&collapse=urlkey")
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read().decode("utf-8", "ignore")
        return json.loads(raw)
    except Exception as e:
        return [["ERR", repr(e)[:90]]]

for host in ["alitool.com.my", "taicon.com.my"]:
    print("== cdx", host)
    rows = cdx(host + "*", 200)
    n = 0
    for r in rows[1:]:
        if isinstance(r, list) and len(r) > 2 and re.search(r"product|Y93|3388", r[2], re.I):
            print("   ", r[1], r[2][:120])
            n += 1
            if n > 15:
                break
