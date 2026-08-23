import urllib.request, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

u = 'https://sonichardware.com.my/categories-listing/product/1574-swallow-abrasive-sand-paper'
html = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=170, context=ctx).read().decode('utf-8', 'ignore')
print('LEN', len(html))
print('HAS_1548695577:', '1548695577' in html)
refs = set(re.findall(r'[^"\'\s>]*1548695577[^"\'\s<]*', html))
for m in refs:
    print('REF:', m[:200])
imgs = set(re.findall(r'(?:src|href|data-src)=["\']([^"\']*(?:upload|hikashop)[^"\']*\.jpe?g)["\']', html, re.I))
for i in list(imgs)[:15]:
    print('IMG:', i[:200])
