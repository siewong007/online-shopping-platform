import socket, urllib.request, urllib.parse, json
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt5_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

u="http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote("eupro.asia*")+"&output=json&limit=100"
d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90))
for row in d[1:]:
    log(row[1],row[2][:120],row[4] if len(row)>4 else "")

# live probe
try:
    r=urllib.request.urlopen(urllib.request.Request("http://eupro.asia/",headers=UA),timeout=25)
    raw=r.read(200000)
    log("LIVE http://eupro.asia/",r.status,"len",len(raw))
    open("eupro_asia_home.html","wb").write(raw)
except Exception as e:
    log("ERR live",repr(e)[:100])
out.close()
print(open("alt5_1020_out.txt",encoding="utf-8",errors="replace").read())
