import socket, urllib.request
socket.setdefaulttimeout(30)
UA={"User-Agent":"Mozilla/5.0 Chrome/124.0"}
print("LIVE BODY:", open("alt5_1020_out.txt").read().count("x"), flush=True)
try:
    raw=open("eupro_asia_home.html","rb").read()
    print("LIVE RAW:",raw[:200],flush=True)
except Exception as e:
    print("ERR",e,flush=True)
u="http://web.archive.org/web/20211202072120/http://eupro.asia/"
try:
    x=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read(500000).decode("utf-8","ignore")
    print("ARCH LEN",len(x),flush=True)
    open("eupro_asia_arch.html","w",encoding="utf-8").write(x)
    import re
    t=re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>"," ",x)
    t=re.sub(r"<[^>]+>"," ",t); t=re.sub(r"\s+"," ",t)
    print("ARCH TEXT:",t[:1500],flush=True)
    imgs=set(re.findall(r'https?://[^\s"\')]+\.(?:jpg|jpeg|png)',x))
    for i in list(imgs)[:20]: print("IMG:",i[:140],flush=True)
except Exception as e:
    print("ERR arch",repr(e)[:120],flush=True)
