import json, sys, socket, urllib.request, urllib.parse
socket.setdefaulttimeout(30)
UA = {"User-Agent": "Mozilla/5.0 Chrome/124.0"}

def cdx(pattern, limit=60):
    u = ("http://web.archive.org/cdx/search/cdx?url=" + urllib.parse.quote(pattern, safe="")
         + "&output=json&limit=" + str(limit) + "&collapse=urlkey")
    raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45).read().decode("utf-8", "ignore")
    try:
        d = json.loads(raw)
    except Exception:
        print("BADJSON", raw[:120], flush=True)
        return
    if len(d) <= 1:
        print("CDX", pattern, "-> 0 urls", flush=True)
        return
    print("CDX", pattern, "->", len(d) - 1, "urls", flush=True)
    for r in d[1:]:
        print("  ", r[1], r[3], r[2][:120], flush=True)

if __name__ == "__main__":
    for p in sys.argv[1:]:
        try:
            cdx(p)
        except Exception as e:
            print("FAIL", p, repr(e)[:90], flush=True)
