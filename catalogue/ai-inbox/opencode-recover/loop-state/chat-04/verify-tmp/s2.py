import urllib.request, re, ssl
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
hdr={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36'}
for u in ['https://www.sonichardware.com.my/index.php?option=com_search&q=grating','https://www.sonichardware.com.my/grating','https://www.sonichardware.com.my/']:
    try:
        h=urllib.request.urlopen(urllib.request.Request(u,headers=hdr),timeout=45,context=ctx).read().decode('utf8','ignore')
        hits=re.findall(r'href=\"([^\"]*(?:grating|product/[^\"]*)[^\"]*)\"',h,re.I)
        print(u,'LEN',len(h),'hits',len(hits))
        for x in list(dict.fromkeys(hits))[:8]: print('  ',x[:150])
    except Exception as e: print(u,'ERR',e)
