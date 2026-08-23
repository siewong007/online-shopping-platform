import re
import ssl
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
h = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'}
u = 'https://hafelehome.com.my/products/hafele-cylindrical-lock-mcd-3101'
req = urllib.request.Request(u, headers=h)
d = urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8', 'ignore')
print('len', len(d))
for pat in ['489.93.125', '489-93-125', 'Entrance', 'Knob', 'MCD 3101', 'Stainless']:
    idx = [m.start() for m in re.finditer(re.escape(pat), d)]
    print(pat, len(idx), idx[:5])
m = re.search(r'<title>(.*?)</title>', d, re.S)
print('TITLE:', m.group(1).strip()[:200])
for m in re.finditer(r'og:image" content="([^"]+)"', d):
    print('OG:', m.group(1)[:160])
# context around model number occurrence
i = d.find('489.93.125')
if i > -1:
    print('CTX:', re.sub(r'\s+', ' ', d[max(0, i-300):i+300])[:600])
