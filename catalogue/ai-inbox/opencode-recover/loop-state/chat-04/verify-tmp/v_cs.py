import urllib.request, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

u = 'https://cheongseng.com.my/index.php?ws=ourproducts&cid=364531&cat=Car%20Paint&subcat=Tapes-Sandpapers'
html = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=90, context=ctx).read().decode('utf-8', 'ignore')

text = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S | re.I)
plain = re.sub(r'<[^>]+>', ' ', text)
plain = re.sub(r'\s+', ' ', plain)

hits = [m.start() for m in re.finditer(r'(?i)(swallow|sand ?paper)', plain)]
print('HITS', len(hits))
shown = set()
for h in hits[:30]:
    seg = plain[max(0, h - 100):h + 160]
    if seg[:40] not in shown:
        shown.add(seg[:40])
        print('...', seg.strip()[:240])

urls = set(re.findall(r'(?:href|src)=["\']([^"\']+)["\']', html))
for l in sorted(urls):
    if re.search(r'(?i)(swallow|sandpaper|sand-paper|sand_paper)', l):
        print('URL:', l[:250])
