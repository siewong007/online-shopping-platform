import urllib.request, ssl, re, sys
from collections import OrderedDict

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

url = sys.argv[1]
html = urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=60, context=ctx).read().decode('utf-8', 'ignore')
links = re.findall(r'href=["\']([^"\']+)["\']', html)
seen = OrderedDict()
for l in links:
    if l not in seen and not l.startswith(('#', 'javascript')):
        seen[l] = 1
for l in seen:
    print(l[:250])
print('TOTAL_UNIQUE', len(seen))
