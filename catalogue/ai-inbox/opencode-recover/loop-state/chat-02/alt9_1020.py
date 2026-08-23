import socket, urllib.request, urllib.parse, re, html
socket.setdefaulttimeout(25)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt9_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")
def rss(q):
    uu="https://www.bing.com/search?q="+urllib.parse.quote(q)+"&format=rss"
    try:
        x=urllib.request.urlopen(urllib.request.Request(uu,headers=UA),timeout=25).read(120000).decode("utf-8","ignore")
        items=re.findall(r"<item><title>(.*?)</title>",x)
        doms=" ;; ".join(html.unescape(t)[:55] for t in items[:5])
        log("RSS",q,"->",len(items),"|",doms[:200])
    except Exception as e:
        log("ERR rss",q,repr(e)[:70])
for q in ['"tiger" "g.p" glue 75ml neptune','"aerico" tap aerator 6MC4','kancil hardware industrial sdn bhd PVC casing']:
    rss(q)
out.close()
print(open("alt9_1020_out.txt",encoding="utf-8",errors="replace").read())
