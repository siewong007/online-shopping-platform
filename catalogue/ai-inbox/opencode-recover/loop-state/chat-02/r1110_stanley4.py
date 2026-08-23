import sys, socket, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def cdx(params):
    u = "http://web.archive.org/cdx/search/cdx?" + params
    raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=45).read().decode("utf-8", "ignore")
    return json.loads(raw)

rows = cdx("url=my.stanleytools.global/product*&output=json&limit=2000&collapse=urlkey&filter=statuscode:200")
prods = set()
for r in rows[1:]:
    if len(r) > 2:
        prods.add(r[2])
print("total archived product urls:", len(prods))
kw = re.compile(r"cushion|screwdriver|blade|knife", re.I)
import re
hits = sorted(u for u in prods if kw.search(u))
for u in hits[:80]:
    print(u[:150])
