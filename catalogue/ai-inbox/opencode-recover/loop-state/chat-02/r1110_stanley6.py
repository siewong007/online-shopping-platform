import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25)
    return r.read(2500000).decode("utf-8", errors="ignore")

h = get('https://cee.stanleytools.global/products/hand-tools/screwdrivers-hex-keys/screwdrivers')
links = sorted(set(re.findall(r'href="(/product/[^"]+)"', h)))
print("cee product links:", len(links))
cg = [l for l in links if re.search(r"cushion", l, re.I)]
print("cushion:", len(cg))
for l in cg:
    print(" ", l[:130])
