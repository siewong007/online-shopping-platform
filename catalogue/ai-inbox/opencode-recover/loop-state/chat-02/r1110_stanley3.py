import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25)
        return r.status, r.read(2500000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)

urls = [
    "https://my.stanleytools.global/products/hand-tools/screwdrivers-hex-keys/screwdrivers",
    "https://my.stanleytools.global/products/hand-tools/screwdrivers-hex-keys/screwdrivers?page=1",
    "https://my.stanleytools.global/products/hand-tools/knives-blades",
]
for u in urls:
    st, h = get(u)
    print("=== ", u, "->", st, len(h))
    if st != 200:
        continue
    links = re.findall(r'href="(/product/[^"]+)"', h)
    uniq = sorted(set(links))
    print("   product links:", len(uniq))
    for l in uniq:
        if re.search(r"(608|604|605|blade|knife)", l, re.I):
            print("   *", l[:110])
