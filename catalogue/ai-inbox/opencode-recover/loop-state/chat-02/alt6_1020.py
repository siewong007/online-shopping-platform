import socket, urllib.request, urllib.parse, json
socket.setdefaulttimeout(20)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt6_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

# google books api: k-prix
try:
    u="https://www.googleapis.com/books/v1/volumes?q="+urllib.parse.quote('"k-prix" mounted point')
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25))
    log("GBOOKS total",d.get("totalItems"))
    for it in d.get("items",[])[:8]:
        vi=it.get("volumeInfo",{})
        log("   ",vi.get("title"),"|",vi.get("publisher"),"|",(vi.get("canonicalVolumeLink") or "")[:100])
except Exception as e:
    log("ERR gbooks",repr(e)[:90])

def head(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=15)
        b=r.read(300)
        log("OK",r.status,u,"len",len(b),b[:80])
    except Exception as e:
        log("ERR",u,repr(e)[:70])

for u in [
 "https://www.paintmaster.com.my/",
 "http://www.paintmaster.com.my/",
 "https://paintmaster.com/",
 "https://paintmaster.my/",
 "https://www.aerico.com/",
 "https://aerico.com.my/",
 "http://www.neptune.com.sg/",
 "https://neptuneindustries.com.sg/",
 "https://ecogreen.com.my/",
 "http://ecogreen.com.my/",
]:
    head(u)
out.close()
print(open("alt6_1020_out.txt",encoding="utf-8",errors="replace").read())
