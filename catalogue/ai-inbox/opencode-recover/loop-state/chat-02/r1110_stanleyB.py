import sys, socket, json, urllib.request, re
socket.setdefaulttimeout(45)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def cdx(params):
    u = "http://web.archive.org/cdx/search/cdx?" + params
    try:
        raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=50).read().decode("utf-8", "ignore")
        return json.loads(raw)
    except Exception as e:
        return [["ERR", repr(e)[:90]]]

for host in ["asia.stanleytools.global", "in.stanleytools.global"]:
    rows = cdx(f"url={host}/product*&output=json&limit=3000&collapse=urlkey")
    urls = sorted({r[2] for r in rows[1:] if len(r) > 2})
    hits = [u for u in urls if re.search(r"(standard-screwdriver|driver-standard|-ph0|608[0-4][0-9])", u, re.I)]
    print("==", host)
    for h in hits:
        print("   ", h[:140])
