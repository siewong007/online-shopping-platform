import socket, urllib.request, urllib.parse, re, html, json
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt8_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

# 1) CDX spray-filtered pages on paintmaster.my
u=("http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote("paintmaster.my*")
   +"&filter=urlkey:.*spray.*&output=json&limit=100")
try:
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=120))
    log("CDX paintmaster.my *spray* rows",max(0,len(d)-1))
    seen=set()
    for row in d[1:]:
        key=row[2].split("?")[0]
        if key in seen: continue
        seen.add(key)
        log("   ",row[1],row[2][:130])
except Exception as e:
    log("ERR cdx spray",repr(e)[:90])

# 2) CDX showproducts list (product ids archived)
u2=("http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote("paintmaster.my/en/showproducts*")
   +"&collapse=urlkey&output=json&limit=200")
try:
    d=json.load(urllib.request.urlopen(urllib.request.Request(u2,headers=UA),timeout=120))
    log("CDX showproducts rows",max(0,len(d)-1))
    for row in d[1:]:
        log("   ",row[1],row[2][:140])
except Exception as e:
    log("ERR cdx sp",repr(e)[:90])

# 3) bing rss documentation batch for commodity tokens
def rss(q):
    uu="https://www.bing.com/search?q="+urllib.parse.quote(q)+"&format=rss"
    try:
        x=urllib.request.urlopen(urllib.request.Request(uu,headers=UA),timeout=25).read(120000).decode("utf-8","ignore")
        items=re.findall(r"<item><title>(.*?)</title>",x)
        doms=[]
        for t in items[:6]:
            t=html.unescape(t)
            doms.append(t[:60])
        log("RSS",q,"->",len(items),"|"," ;; ".join(doms)[:220])
    except Exception as e:
        log("ERR rss",q,repr(e)[:70])

for q in [
 '"YG232" brass elbow',
 '"YG245" brass nipple',
 '"SS235" equal tee SUS304',
 '"SS240R" reducing socket',
 '"SS239" socket mxf',
 '"WB5009" bearing wheelbarrow',
 '"UNI2193" car wash sponge',
 '"7733" ball valve m-man',
 'drop in anchor "1/2 x 2" 5pcs Malaysia',
 'mop broom "No.400" handle Malaysia',
 'alloy hook "1.0TON" lifting',
 'self drilling screw "10 X 1" 50pcs Malaysia',
 '"boat nail" square 50mm Malaysia',
 'U-PVC bend 110mm "45" Malaysia',
]:
    rss(q)
out.close()
print(open("alt8_1020_out.txt",encoding="utf-8",errors="replace").read())
