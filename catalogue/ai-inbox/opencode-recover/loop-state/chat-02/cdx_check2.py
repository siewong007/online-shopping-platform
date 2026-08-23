import socket, json, time
socket.setdefaulttimeout(40)
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}

def get(url, tries=3):
    for i in range(tries):
        req = urllib.request.Request(url, headers=UA)
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except Exception as e:
            err = str(e)
            time.sleep(4)
    return None, err

queries = [
    ("5342-prefix", "hardexworld.com/product/he4251*&output=json&limit=20"),
    ("5342-site", "hardexworld.com&matchType=domain&output=json&limit=10&collapse=urlkey"),
    ("5343-prefix", "hardexworld.com/product/he4252*&output=json&limit=20"),
    ("4755-noplus", "retouch.my/product/m073mg&output=json&limit=20"),
    ("4913-noplus", "retouch.my/product/m061mg&output=json&limit=20"),
    ("4755-prefix", "retouch.my/product/*&output=json&limit=25&collapse=urlkey&filter=statuscode:200"),
]
for tag, q in queries:
    st, body = get("http://web.archive.org/cdx/search/cdx?url=" + q)
    print("===", tag, st)
    print(body[:1200] if body else "")
