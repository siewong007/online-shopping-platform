import re, sys, html, socket, urllib.request, urllib.parse
socket.setdefaulttimeout(12)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"}

def ddg_lite(q):
    u = "https://lite.duckduckgo.com/lite/?q=" + urllib.parse.quote(q)
    raw = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=12).read().decode("utf-8", "ignore")
    links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>', raw)
    ext = [l for l in links if "duckduckgo" not in l]
    print("DDGLITE", q, "len", len(raw), "extlinks", len(ext), flush=True)
    for l in ext[:10]:
        print("  ", html.unescape(l)[:140], flush=True)

if __name__ == "__main__":
    for q in sys.argv[1:]:
        try:
            ddg_lite(q)
        except Exception as e:
            print("FAIL", q, repr(e)[:90], flush=True)
