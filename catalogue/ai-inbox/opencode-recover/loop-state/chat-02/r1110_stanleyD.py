import sys, socket, json, urllib.request
socket.setdefaulttimeout(60)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
u = ("http://web.archive.org/cdx/search/cdx?url=stanleytools.global&matchType=domain"
     "&output=json&limit=6000&collapse=urlkey&filter=original:.*stmt608.*")
raw = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "ignore")
rows = json.loads(raw)
for r in rows[1:]:
    if len(r) > 2:
        print(r[1], r[2][:140])
