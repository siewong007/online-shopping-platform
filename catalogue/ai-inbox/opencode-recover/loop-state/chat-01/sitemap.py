import re, urllib.request, ssl
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={"User-Agent":"Mozilla/5.0"}
req=urllib.request.Request("https://www.retouch.my/category/sitemap.xml",headers=UA)
with urllib.request.urlopen(req,timeout=40,context=ctx) as r:
    b=r.read(400000).decode("utf-8","replace")
locs=re.findall(r"<loc>([^<]+)</loc>",b)
print("total",len(locs))
for l in locs:
    if re.search(r"elegance|black|socket",l,re.I):
        print("HIT:",l)
