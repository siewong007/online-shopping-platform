import socket, json
socket.setdefaulttimeout(25)
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except Exception as e:
        return None, str(e)

targets = [
    ("4755", "www.retouch.my/product/m073mg"),
    ("4913", "www.retouch.my/product/m061mg"),
    ("5342", "hardexworld.com/product/he4251/"),
    ("5343", "hardexworld.com/product/he4252/"),
]
for pos, u in targets:
    api = f"http://web.archive.org/cdx/search/cdx?url={u}&output=json&limit=30"
    st, body = get(api)
    print(pos, u, "->", st, body[:600] if body else "")
    # retry once on failure
    if st is None or st == 503:
        st2, body2 = get(api)
        print(pos, "retry ->", st2, (body2[:600] if body2 else ""))
