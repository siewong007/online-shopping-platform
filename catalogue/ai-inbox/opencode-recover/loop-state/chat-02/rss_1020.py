import socket, urllib.request, urllib.parse, re, html, os
socket.setdefaulttimeout(20)
UA={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"}

# 1) truflo raw html -> og:image / product gallery urls
try:
    r=urllib.request.urlopen(urllib.request.Request("https://truflo.com.my/product/bib-tap-hose-g503b",headers=UA),timeout=20)
    raw=r.read().decode("utf-8","ignore")
    open("truflo1035.html","w",encoding="utf-8").write(raw)
    imgs=re.findall(r'https://truflo\.com\.my/wp-content/uploads/[^\s"\')]+?\.(?:jpg|jpeg|png|webp)',raw,re.I)
    seen=[]
    for u in imgs:
        if u not in seen: seen.append(u)
    print("TRUFLO IMGS:",len(seen))
    for u in seen[:15]: print("   ",u)
    m=re.search(r'property="og:image" content="([^"]+)"',raw)
    print("OG:",m.group(1) if m else None)
except Exception as e:
    print("ERR truflo",repr(e)[:120])

def rss(q):
    u="https://www.bing.com/search?q="+urllib.parse.quote(q)+"&format=rss"
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20)
        x=r.read(150000).decode("utf-8","ignore")
        items=re.findall(r"<item><title>(.*?)</title><link>(.*?)</link>",x)
        print("RSS",q,"->",len(items),flush=True)
        for t,l in items[:9]:
            print("   ",html.unescape(t)[:95],"|",html.unescape(l)[:120],flush=True)
    except Exception as e:
        print("ERR",q,repr(e)[:90],flush=True)

for q in [
 '"K-PRIX" mounted point Korea',
 'kprix mounted point grinder official',
 'Eupro fishing hook octopus official website',
 '"Paint Master" spray paint aerosol Malaysia',
]:
    rss(q)
