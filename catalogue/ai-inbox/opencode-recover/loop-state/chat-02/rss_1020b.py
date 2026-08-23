import socket, urllib.request, urllib.parse, re, html, sys
socket.setdefaulttimeout(20)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("rss_1020_out.txt","w",encoding="utf-8")

def rss(q):
    u="https://www.bing.com/search?q="+urllib.parse.quote(q)+"&format=rss"
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20)
        x=r.read(150000).decode("utf-8","ignore")
        items=re.findall(r"<item><title>(.*?)</title><link>(.*?)</link>",x)
        out.write(f"RSS {q} -> {len(items)}\n")
        for t,l in items[:9]:
            out.write(f"    {html.unescape(t)[:95]} | {html.unescape(l)[:130]}\n")
    except Exception as e:
        out.write(f"ERR {q} {repr(e)[:90]}\n")

for q in [
 "kprix mounted point",
 "kprix Korea abrasive grinding stone",
 "eupro hook 9255 octopus",
 "eupro fishing tackle Malaysia official",
 '"paint master" spray paint malaysia',
 "paintmaster aerosol colour chart malaysia",
 "ecogreen tap adaptor EG4026",
 "ecogreen garden fitting Malaysia",
 "cavallo garden hose 5/8 x 50m yellow",
 "kancil PVC casing 2x1 Malaysia trunking",
]:
    rss(q)
out.close()
print(open("rss_1020_out.txt",encoding="utf-8").read())
