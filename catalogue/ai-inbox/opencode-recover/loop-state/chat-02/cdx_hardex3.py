import sys, socket, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def cdx(params):
    u = "http://web.archive.org/cdx/search/cdx?" + params
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=40).read().decode("utf-8", "ignore")
        return json.loads(raw)
    except Exception as e:
        return [["ERR", repr(e)[:90]]]

q = "url=hardexworld.com*&output=json&limit=800&filter=original:.*2553252.*&collapse=urlkey"
print("== any 2553252")
for r in cdx(q):
    if isinstance(r, list) and len(r) > 2:
        print(r[1], r[4], r[2][:130])
q = "url=m.hardexworld.com*&output=json&limit=300&collapse=urlkey"
print("== m subdomain sample")
n = 0
for r in cdx(q):
    if isinstance(r, list) and len(r) > 2:
        if "showproducts" in r[2]:
            n += 1
            if n < 25:
                print(r[1], r[4], r[2][:130])
print("m showproducts total:", n)
