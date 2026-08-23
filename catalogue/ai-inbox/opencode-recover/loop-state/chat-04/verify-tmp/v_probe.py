import urllib.request, ssl, re, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

def get(url):
    req = urllib.request.Request(url, headers=HDR)
    return urllib.request.urlopen(req, timeout=60, context=ctx).read().decode('utf-8', 'ignore')

url = sys.argv[1]
html = get(url)
links = re.findall(r'href=["\']([^"\']+)["\']', html)
kws = ('sand', 'abrasive', 'swallow', 'grit')
seen = set()
for l in links:
    low = l.lower()
    if any(k in low for k in kws) and l not in seen:
        seen.add(l)
        print(l[:220])
print('TOTAL_LINKS', len(links), 'HTMLLEN', len(html))
