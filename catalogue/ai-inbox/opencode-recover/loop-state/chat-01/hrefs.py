import re, urllib.request, ssl
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={"User-Agent":"Mozilla/5.0"}
req=urllib.request.Request("https://www.retouch.my/ourproducts/cid/577199/cat/switch-sockets-elegance-sense039s-black/",headers=UA)
with urllib.request.urlopen(req,timeout=40,context=ctx) as r:
    b=r.read().decode("utf-8","replace")
hrefs=re.findall(r'href="([^"]+)"[^>]*>([^<]{0,60})',b)
seen=set()
for h,t in hrefs:
    if re.search(r"ourproducts|showproducts|productid",h,re.I) and h not in seen:
        seen.add(h)
        print(h[:120],"|",t.strip()[:50])
