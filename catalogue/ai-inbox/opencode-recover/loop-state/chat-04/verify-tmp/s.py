import urllib.request, urllib.parse, re, ssl
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
hdr={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'}
q='site:sonichardware.com.my \"com_hikashop/upload/thumbnails/600x600f/4-1.jpg\"'
u='https://www.bing.com/search?q='+urllib.parse.quote(q)
try:
    h=urllib.request.urlopen(urllib.request.Request(u,headers=hdr),timeout=60,context=ctx).read().decode('utf8','ignore')
    links=re.findall(r'href=\"(https://www\.sonichardware\.com\.my/[^\"]+)\"',h)
    print('LEN',len(h))
    for x in list(dict.fromkeys(links))[:10]: print(x[:160])
except Exception as e: print('ERR',e)
