import socket
socket.setdefaulttimeout(25)
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}

def head(url):
    req = urllib.request.Request(url, headers=UA, method="GET")
    try:
        with urllib.request.urlopen(req) as r:
            body = r.read(4000)
            return f"{r.status} {r.geturl()} len>={len(body)}"
    except Exception as e:
        return str(e)

print("hardexworld root:", head("https://hardexworld.com/"))
print("retouch root:", head("https://www.retouch.my/"))
for u in ["https://www.retouch.my/product/m073mg", "https://www.retouch.my/product/m061mg",
          "https://hardexworld.com/product/he4251/", "https://hardexworld.com/product/he4252/"]:
    print(u, "->", head(u))
