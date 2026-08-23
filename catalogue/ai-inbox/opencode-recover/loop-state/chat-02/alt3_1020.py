import socket, urllib.request, urllib.parse, json
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt3_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

try:
    q='https://archive.org/advancedsearch.php?q='+urllib.parse.quote('"k-prix"')+'&fl%5B%5D=identifier&fl%5B%5D=title&rows=30&output=json'
    d=json.load(urllib.request.urlopen(urllib.request.Request(q,headers=UA),timeout=60))
    docs=d.get("response",{}).get("docs",[])
    log("IA-SEARCH k-prix ->",len(docs))
    for x in docs[:20]: log("   ",x.get("identifier"),"|",(x.get("title") or "")[:80])
except Exception as e:
    log("ERR ia",repr(e)[:100])

for pat in ["eupro*","k-prix.co.kr*","kprix.co.kr*"]:
    u="http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote(pat)+"&output=json&limit=80"
    try:
        d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120))
        log("CDX",pat,"rows",max(0,len(d)-1))
        if len(d)>1:
            hosts={}
            for row in d[1:]:
                h=row[2].split("/")[0]
                hosts[h]=hosts.get(h,0)+1
            for h,c in sorted(hosts.items(),key=lambda kv:-kv[1])[:15]:
                log("    HOST",h,c)
    except Exception as e:
        log("ERR cdx",pat,repr(e)[:90])
out.close()
print(open("alt3_1020_out.txt",encoding="utf-8",errors="replace").read())
