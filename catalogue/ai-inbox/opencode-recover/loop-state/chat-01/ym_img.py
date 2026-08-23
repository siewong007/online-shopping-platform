import re, urllib.request, ssl
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA={"User-Agent":"Mozilla/5.0"}
u="https://www.yuanming.com.my/product/morries-uk-plug-travel-adaptor-ms3106n/"
req=urllib.request.Request(u,headers=UA)
with urllib.request.urlopen(req,timeout=40,context=ctx) as r:
    b=r.read().decode("utf-8","replace")
for name in ["41-600x600","40-600x600","39-600x600","38-600x600"]:
    print(name, [m.start() for m in re.finditer(re.escape(name),b)][:6])
k=b.find("Model:")
print("Model: at",k)
# context around first 41-600x600 occurrence
j=b.find("41-600x600")
if j>0:
    print(b[max(0,j-400):j+200].replace("\n"," ")[:700])
