import re, urllib.request, ssl
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={"User-Agent":"Mozilla/5.0"}
u="https://www.retouch.my/showproducts/productid/5703834/cid/577199/sockets/"
req=urllib.request.Request(u,headers=UA)
with urllib.request.urlopen(req,timeout=40,context=ctx) as r:
    b=r.read().decode("utf-8","replace")
t=re.search(r"<title[^>]*>(.*?)</title>",b,re.S)
print("TITLE:",re.sub(r"\s+"," ",t.group(1))[:160] if t else "?")
text=re.sub(r"<script.*?</script>"," ",b,flags=re.S)
text=re.sub(r"<[^>]+>"," ",text); text=re.sub(r"\s+"," ",text)
for pat in [r"E08\d+\w*", r"13A[^\n]{0,60}", r"[Nn]eon"]:
    ms=list(re.finditer(pat,text))
    print(f"pat {pat}: {len(ms)} hits")
    for m in ms[:6]:
        s=max(0,m.start()-80); print("   ...",text[s:m.end()+90])
imgs=re.findall(r'(?:src|href|content)="(https?://[^"]+(?:jpg|jpeg|png|webp)[^"]*)"',b)
seen=[]
for i in imgs:
    if i not in seen and not re.search(r"logo|icon",i,re.I): seen.append(i)
for i in seen[:8]: print("IMG:",i[:170])
