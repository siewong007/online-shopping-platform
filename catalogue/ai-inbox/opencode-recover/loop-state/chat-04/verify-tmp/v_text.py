import urllib.request, ssl, re, sys

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

url = sys.argv[1]
try:
    html = urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=60, context=ctx).read().decode('utf-8', 'ignore')
except Exception as e:
    print('HTTPERR', repr(e)[:200])
    sys.exit(0)

text = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S | re.I)
text = re.sub(r'<[^>]+>', ' ', text)
text = re.sub(r'\s+', ' ', text)

hits = [m.start() for m in re.finditer(r'(?i)(swallow|abrasive|sand)', text)]
print('TITLE:', re.search(r'<title>(.*?)</title>', html, re.S | re.I).group(1).strip()[:150] if re.search(r'<title>', html, re.I) else 'n/a')
print('HITS', len(hits))
shown = set()
for h in hits[:40]:
    seg = text[max(0, h - 80):h + 120]
    key = seg[:50]
    if key not in shown:
        shown.add(key)
        print('...', seg.strip()[:220])
links = re.findall(r'href=["\']([^"\']*product[^"\']*)["\']', html)
uniq = list(dict.fromkeys(links))
for l in uniq[:30]:
    print('LINK', l[:220])
