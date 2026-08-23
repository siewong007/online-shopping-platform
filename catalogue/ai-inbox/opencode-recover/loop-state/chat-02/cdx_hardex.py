import sys, socket, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def cdx(pattern, limit=60):
    u = "http://web.archive.org/cdx/search/cdx?url=" + urllib.parse.quote(pattern, safe="") + "&output=json&limit=" + str(limit)
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode("utf-8", "ignore")
        return json.loads(raw)
    except Exception as e:
        return [["ERR", repr(e)[:90]]]

print("== 2553252 raw")
for r in cdx("hardexworld.com*products_id=2553252*", 20):
    print(r if isinstance(r, list) else r)
print("== any showproducts")
for r in cdx("hardexworld.com/index.php*", 200):
    if len(r) > 2 and "showproducts" in r[2] and "products_id" in r[2]:
        print(r[1], r[3], r[2][:130])
