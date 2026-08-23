import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u, n=1200000):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.geturl(), r.read(n).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, u, repr(e)[:80]

st, fu, h = get("https://www.kingtoyo.com.my/")
print("KT home:", st, len(h))
# nav links + search pattern
links = sorted(set(re.findall(r'href="([^"]+)"', h)))
for l in links[:60]:
    if any(k in l.lower() for k in ("product", "catalog", "search", "category")):
        print("  L:", l[:110])
m = re.search(r'(?i)(search[^<>]{0,120})', h)
print("search hint:", m.group(1)[:120] if m else "-")

st2, fu2, h2 = get("https://www.blimax.com.my/")
print("BLX home:", st2, len(h2))
for l in sorted(set(re.findall(r'href="([^"]+)"', h2)))[:40]:
    if any(k in l.lower() for k in ("product", "hole", "saw", "shop", "categor")):
        print("  B:", l[:110])
