import socket, urllib.request, re, sys
socket.setdefaulttimeout(60)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}

for u in ["http://web.archive.org/web/20161211062546/http://www.kancil.com.my/products.html",
          "http://web.archive.org/web/20131221023616/http://www.kancil.com.my:80/products3.html"]:
    try:
        raw=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90).read(900000)
        txt=raw.decode("utf-8","ignore")
        t=re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>"," ",txt)
        t=re.sub(r"<[^>]+>"," ",t); t=re.sub(r"\s+"," ",t)
        print("====",u,"len",len(raw))
        print(t[:2500])
        open(("kancil_prod1" if "20161" in u else "kancil_prod3")+".html","w",encoding="utf-8").write(txt)
    except Exception as e:
        print("ERR",u,repr(e)[:110])
