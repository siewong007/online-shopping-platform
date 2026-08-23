import socket, urllib.request, urllib.parse, re, html, json
socket.setdefaulttimeout(25)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"}
out=open("alt2_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

# 1) CDX wildcard-host probe
for pat in ["kprix*","k-prix*"]:
    u="http://web.archive.org/cdx/search/cdx?url="+pat+"&output=json&limit=60"
    try:
        d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30))
        log("CDX",pat,"rows",max(0,len(d)-1))
        hosts={}
        if len(d)>1:
            for row in d[1:]:
                h=row[2].split("/")[0]
                hosts[h]=hosts.get(h,0)+1
            for h,c in sorted(hosts.items(), key=lambda kv:-kv[1])[:15]:
                log("    HOST",h,c)
    except Exception as e:
        log("ERR cdx",pat,repr(e)[:90])

# 2) ecosia / brave html
def eng(name,u):
    try:
        x=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25).read(200000).decode("utf-8","ignore")
        urls=re.findall(r'href="(https?://[^"]+)"',x)
        ext=[u0 for u0 in urls if not any(b in u0 for b in ("ecosia","brave","bing.","microsoft","google.","w3.org"))]
        log(name,"len",len(x),"ext",len(ext))
        seen=[]
        for l in ext:
            if l not in seen: seen.append(l)
        for l in seen[:12]: log("   ",html.unescape(l)[:130])
    except Exception as e:
        log("ERR",name,repr(e)[:90])

q='k-prix mounted point grinding stone'
eng("ECOSIA","https://www.ecosia.org/search?q="+urllib.parse.quote(q))
eng("BRAVE","https://search.brave.com/search?q="+urllib.parse.quote(q))
out.close()
print(open("alt2_1020_out.txt",encoding="utf-8",errors="replace").read())
