import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def probe(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15)
        b = r.read(120000)
        return r.status, r.geturl(), b
    except urllib.error.HTTPError as e:
        return e.code, u, b""
    except Exception as e:
        return -1, u, repr(e)[:60].encode()

domains = [
    "https://taicon.com.my/", "http://taicon.com.my/", "https://www.taicon.com.my/",
    "https://alitool.com.my/", "https://www.alitool.com.my/", "http://alitool.com.my/",
    "https://kingtoyo.com/", "https://www.kingtoyo.com.my/", "https://kingtoyo.com.my/",
    "https://blimax.com.my/", "https://www.blimax.com.sg/", "https://blimaxtools.com/",
    "https://ultra.com.my/", "https://www.ultralite.com.my/",
    "https://hardex.com.my/",
]
for d in domains:
    st, fu, b = probe(d)
    title = ""
    if b[:1] == b"<":
        m = re.search(rb"<title>([^<]{3,90})", b, re.I)
        title = m.group(1)[:80].decode("utf-8", "ignore") if m else ""
    print(f"{st} {fu[:70]} | {title}")
