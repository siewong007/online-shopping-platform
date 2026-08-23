import socket, urllib.request, urllib.parse, json
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt7_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

u="http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote("paintmaster.my*")+"&output=json&limit=300"
try:
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120))
    log("CDX paintmaster.my rows",max(0,len(d)-1))
    seen=set()
    if len(d)>1:
        for row in d[1:]:
            orig=row[2]
            key=orig.split("?")[0].rstrip("/")
            if key in seen: continue
            seen.add(key)
            log(row[1],orig[:130])
except Exception as e:
    log("ERR",repr(e)[:100])
out.close()
print(open("alt7_1020_out.txt",encoding="utf-8",errors="replace").read())
