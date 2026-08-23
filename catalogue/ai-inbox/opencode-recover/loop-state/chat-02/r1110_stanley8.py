import sys, socket, re, json, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36", "Accept": "application/json"}

def ac(q):
    u = ("https://my.stanleytools.global/search_api_autocomplete/acquia_search_solr"
         "?display=page&&filter=" + urllib.parse.quote(q))
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.read(400000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:100]

for q in ["cushion grip", "snap off blade 9mm", "screwdriver phillips ph0",
          "screwdriver flared", "knife blade"]:
    st, body = ac(q)
    print("=== q:", q, "->", st)
    if st == 200:
        try:
            data = json.loads(body)
            out = []
            def walk(o):
                if isinstance(o, dict):
                    for v in o.values():
                        walk(v)
                elif isinstance(o, list):
                    for v in o:
                        walk(v)
                elif isinstance(o, str) and ("/product/" in o or len(o) > 12):
                    out.append(o)
            walk(data)
            seen = set()
            for s in out:
                s2 = re.sub(r"\s+", " ", s)[:150]
                k = s2[:80]
                if k not in seen:
                    seen.add(k)
                    print("   ", s2)
                if len(seen) > 18:
                    break
        except Exception:
            print("   raw:", body[:300])
