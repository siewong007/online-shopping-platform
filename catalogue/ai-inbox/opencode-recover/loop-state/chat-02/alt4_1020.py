import socket, urllib.request, urllib.parse, json, re
socket.setdefaulttimeout(40)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
out=open("alt4_1020_out.txt","w",encoding="utf-8")
def log(*a): out.write(" ".join(str(x) for x in a)+"\n")

def cdx(pat):
    u="http://web.archive.org/cdx/search/cdx?url="+urllib.parse.quote(pat)+"&output=json&limit=15"
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=90))
    return max(0,len(d)-1) if isinstance(d,list) else 0

for pat in ["cabana.com.my*",           # sanity: known archived MY site
            "truflo.com.my*",           # sanity: known live MY site
            "eupro.com.my*","eupro.com.sg*","eupro.asia*","euproeurope.com*"]:
    try: log("CDX",pat,"rows",cdx(pat))
    except Exception as e: log("ERR cdx",pat,repr(e)[:90])

# ddg lite raw dump for k-prix
try:
    u="https://lite.duckduckgo.com/lite/?q="+urllib.parse.quote('k-prix mounted point')
    x=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30).read(300000).decode("utf-8","ignore")
    log("DDGLITE raw len",len(x))
    open("ddglite_kprix.html","w",encoding="utf-8").write(x)
    links=re.findall(r'href="([^"]+)"',x)
    ext=[l for l in links if "duckduckgo" not in l and l.startswith("http")]
    log("extlinks",len(ext))
    for l in ext[:12]: log("   ",l[:140])
except Exception as e:
    log("ERR ddglite",repr(e)[:100])
out.close()
print(open("alt4_1020_out.txt",encoding="utf-8",errors="replace").read())
