import socket, urllib.request
socket.setdefaulttimeout(25)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
for u in ["https://kancil.com.my/","http://www.kancil.com.my/"]:
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20)
        print("OK",r.status,u,len(r.read(300)))
    except Exception as e:
        print("ERR",u,repr(e)[:110])

# verify TF-Bib-tap-hose-1.jpg sits inside the G503B product gallery block
raw=open("truflo1035.html",encoding="utf-8",errors="ignore").read()
import re
i=raw.find("TF-Bib-tap-hose-1")
print("first idx",i)
seg=raw[max(0,i-3000):i+1500]
j=seg.rfind("woocommerce-product-gallery")
print("gallery marker near:",j)
# find all occurrences context
for m in re.finditer("TF-Bib-tap-hose-1",raw):
    s=max(0,m.start()-200)
    ctx=re.sub(r"\s+"," ",raw[s:m.start()+120])
    print("---",ctx[-260:])
