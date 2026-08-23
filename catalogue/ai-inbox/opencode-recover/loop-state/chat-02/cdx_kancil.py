import socket, urllib.request, urllib.parse, json
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
u="http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote("kancil.com.my*")+"&output=json&limit=200"
d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120))
print("rows",max(0,len(d)-1))
seen=set()
for row in d[1:]:
    key=row[2].split("?")[0]
    if key in seen: continue
    seen.add(key)
    print(row[1],row[2][:130])
