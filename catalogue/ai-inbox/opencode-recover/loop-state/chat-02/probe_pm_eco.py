import socket, urllib.request, re
socket.setdefaulttimeout(20)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}

def get(u, n=400000):
    r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20)
    return r.status, r.read(n).decode("utf-8","ignore")

for base in ["https://paintmaster.com.my","http://paintmaster.com.my","https://www.ecogreen.com.my"]:
    for path in ["/","/wp-sitemap.xml","/sitemap.xml","/sitemap_index.xml"]:
        u=base+path
        try:
            st,x=get(u)
            locs=re.findall(r"<loc>([^<]+)</loc>",x)[:40]
            print("OK",st,u,"len",len(x),"locs",len(locs))
            for l in locs[:25]: print("     ",l)
            if path=="/":
                t=re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>"," ",x)
                t=re.sub(r"<[^>]+>"," ",t); t=re.sub(r"\s+"," ",t)
                print("   TITLE:",t[:300])
            break_ = False
        except Exception as e:
            print("ERR",u,repr(e)[:80])
