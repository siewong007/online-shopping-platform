import socket, urllib.request, urllib.parse, re, html
socket.setdefaulttimeout(20)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"}
out=open("alt_1020_out.txt","w",encoding="utf-8")

def log(*a):
    out.write(" ".join(str(x) for x in a)+"\n")

def ddg_html(q):
    u="https://html.duckduckgo.com/html/?q="+urllib.parse.quote(q)
    r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20)
    x=r.read(200000).decode("utf-8","ignore")
    links=re.findall(r'result__a[^>]*href="([^"]+)"',x)
    snips=re.findall(r'result__snippet[^>]*>(.*?)</a>',x,re.S)
    log("DDGHTML",q,"->",len(links))
    for i,l in enumerate(links[:8]):
        l=html.unescape(l)
        if l.startswith("//duckduckgo.com/l/?uddg="):
            m=re.search(r"uddg=([^&]+)",l)
            if m: l=urllib.parse.unquote(m.group(1))
        s=re.sub(r"<[^>]+>","",snips[i]) if i<len(snips) else ""
        log("   ",l[:120],"::",html.unescape(s)[:100])

def searx(q, base):
    u=base+"/search?q="+urllib.parse.quote(q)+"&format=json"
    req=urllib.request.Request(u,headers={"User-Agent":UA["User-Agent"]})
    import json
    d=json.load(urllib.request.urlopen(req,timeout=20))
    rs=d.get("results",[])
    log("SEARX",base,q,"->",len(rs))
    for r0 in rs[:8]:
        log("   ",r0.get("url","")[:120],"::",(r0.get("title") or "")[:90])

try:
    ddg_html('K-PRIX mounted point Korea')
except Exception as e:
    log("ERR ddg_html",repr(e)[:100])
for b in ["https://searx.be","https://search.bus-hit.me","https://priv.au"]:
    try:
        searx('k-prix mounted point grinding stone',b)
        break
    except Exception as e:
        log("ERR searx",b,repr(e)[:80])
out.close()
print(open("alt_1020_out.txt",encoding="utf-8",errors="replace").read())
