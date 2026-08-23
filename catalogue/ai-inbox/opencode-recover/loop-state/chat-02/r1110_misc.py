import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=18)
        return r.status, r.read(1500000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:70]

st, h = get("https://www.blimax.com.my/?s=hole+saw")
print("blimax search:", st)
hits = sorted(set(re.findall(r'href="(https://www\.blimax\.com\.my/product/[^"]+)"', h)))
for l in hits[:25]:
    print("  ", l[:120])
if not hits:
    m = re.findall(r"(?i)hole[- ]saw[^<]{0,60}", h)[:8]
    print("  text hits:", m)

st, h = get("https://www.ultralite.com.my/")
print("ultralite:", st, len(h))
t = re.search(rb"", b"") if False else re.search(r"<title>([^<]{3,90})", h, re.I)
print("  title:", t.group(1)[:90] if t else "-")

for d in ["http://alitool.com/", "https://alitoolsb.com/", "https://www.alitoolsb.com/",
          "https://aerico.com.my/", "https://www.aerico.com/products"]:
    st, h2 = get(d)
    t2 = ""
    if st == 200:
        m2 = re.search(r"<title>([^<]{3,90})", h2, re.I)
        t2 = m2.group(1)[:80] if m2 else ""
    print(d, "->", st, "|", t2)
