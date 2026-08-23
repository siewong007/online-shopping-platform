import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25)
        return r.status, r.read(900000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)

for q in ["cushion grip screwdriver phillips ph0", "cushion grip screwdriver flared 150mm",
          "snap off knife blade 9mm", "cushion grip screw driver"]:
    st, h = get("https://my.stanleytools.global/search?q=" + urllib.parse.quote(q))
    print("=== q:", q, "->", st, len(h))
    if st != 200:
        continue
    links = re.findall(r'href="(/product/[^"]+)"[^>]*>([^<]{5,110})', h)
    seen = set()
    for l, t in links:
        if l not in seen:
            seen.add(l)
            print("   ", l[:90], "|", t.strip()[:90])
        if len(seen) > 14:
            break
