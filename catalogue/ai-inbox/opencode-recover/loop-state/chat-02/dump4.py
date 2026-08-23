import socket, urllib.request, re
socket.setdefaulttimeout(25)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}

def dump(name,u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25)
        raw=r.read(800000).decode("utf-8","ignore")
        t=re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>"," ",raw)
        t=re.sub(r"<[^>]+>"," ",t); t=re.sub(r"\s+"," ",t)
        print("====",name,r.status,"len",len(raw))
        print(t[:900])
        open(name+".html","w",encoding="utf-8").write(raw)
    except Exception as e:
        print("====",name,"ERR",repr(e)[:100])

dump("paintmaster_my","https://paintmaster.my/")
dump("aerico","https://www.aerico.com/")
dump("neptune_sg","http://www.neptune.com.sg/")
dump("ecogreen_my","https://ecogreen.com.my/")
