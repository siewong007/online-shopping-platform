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

for q in ["TOP9PCS", "ball point hex key", "hex key"]:
    st, fu, h = get("https://www.kingtoyo.com.my/?s=" + urllib.parse.quote(q))
    print("=== q:", q, "->", st, len(h))
    items = re.findall(r'<h2[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]{3,90})</a>', h)
    if not items:
        items = re.findall(r'<a href="(https://www\.kingtoyo\.com\.my/product/[^"]+)"[^>]*>(?:[^<]{0,60}<[^>]+>)*([^<]{3,90})<', h)
    seen = set()
    for l, t in items:
        if l not in seen:
            seen.add(l)
            print("   ", l[:100], "|", t.strip()[:70])
    if not seen:
        m = re.search(r"(?i)(nothing found|no results|sorry)", h)
        print("   ", m.group(1) if m else "(no product links parsed)")

st, fu, h = get("https://www.blimax.com.my/?s=hole+saw")
print("=== BLX hole saw:", st, len(h))
for l, t in re.findall(r'<a href="(https://www\.blimax\.com\.my/[^"]*)"([^>]*)>([^<]{3,80})</a>', h):
    if "hole" in (l + t).lower() and "/our-products/" in l:
        print("   ", l[:100], "|", t.strip()[:60])
