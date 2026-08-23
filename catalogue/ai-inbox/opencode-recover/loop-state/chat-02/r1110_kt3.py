import sys, socket, re, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u, n=1500000):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.geturl(), r.read(n).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, u, repr(e)[:80]

st, fu, h = get("https://www.kingtoyo.com.my/?s=hex+key")
open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\kt_search.html", "w", encoding="utf-8").write(h)
print("len:", len(h))
# look for any /products/ links
ls = sorted(set(re.findall(r'href="([^"]*products[^"]*)"', h)))
print("product links:", len(ls))
for l in ls[:20]:
    print("  ", l[:120])
m = re.search(r"(?i)(no results|nothing found|not found any)", h)
print("noresult marker:", m.group(1) if m else "-")
