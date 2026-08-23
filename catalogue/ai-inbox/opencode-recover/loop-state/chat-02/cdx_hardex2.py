import sys, socket, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def cdx(pattern, limit=100):
    u = "http://web.archive.org/cdx/search/cdx?url=" + urllib.parse.quote(pattern, safe="") + "&output=json&limit=" + str(limit)
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read().decode("utf-8", "ignore")
        return json.loads(raw)
    except Exception as e:
        return [["ERR", repr(e)[:90]]]

print("== repair-maintenance cat pages")
for r in cdx("hardexworld.com*REPAIR-MAINTENANCE*", 60):
    if len(r) > 2:
        print(r[1], r[4] if len(r) > 4 else "", r[2][:120])
print("== direct 2553252")
for r in cdx("hardexworld.com/index.php%3Fws%3Dshowproducts%26products_id%3D2553252*", 20):
    if isinstance(r, list) and len(r) > 2:
        print(r[1], r[2][:130])
