import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.read(3000000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:80]

st, b = get("https://www.kingtoyo.com.my/sitemap_index.xml")
if st != 200:
    st, b = get("https://www.kingtoyo.com.my/wp-sitemap.xml")
print("sitemap idx:", st)
locs = re.findall(r"<loc>([^<]+)</loc>", b)
for l in locs[:15]:
    print("  ", l[:120])
# product sitemap?
prod_sm = [l for l in locs if "product" in l]
for sm in prod_sm[:2]:
    st2, b2 = get(sm)
    print("==", sm, "->", st2)
    urls = re.findall(r"<loc>([^<]+)</loc>", b2)
    print("   urls:", len(urls))
    for u in urls:
        if re.search(r"hex|key|ball", u, re.I):
            print("   *", u[:130])
