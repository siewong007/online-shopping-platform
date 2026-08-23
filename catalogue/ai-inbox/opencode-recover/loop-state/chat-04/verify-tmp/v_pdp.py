import urllib.request, ssl, re, sys

sys.stdout.reconfigure(errors='replace')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

u = 'https://www.cheongseng.com.my/index.php?ws=showproducts&products_id=3504187&cat=Car-Paint&subcat=Tapes-Sandpapers'
html = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=90, context=ctx).read().decode('utf-8', 'ignore')

t = re.search(r'<title>(.*?)</title>', html, re.S | re.I)
print('TITLE:', t.group(1).strip()[:200] if t else 'n/a')
print('HAS_MD5ID_8c9ce62e:', '8c9ce62eb00bfc39549c0b3cbe197ceb' in html)

text = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
text = re.sub(r'<style.*?</style>', ' ', text, flags=re.S | re.I)
plain = re.sub(r'<[^>]+>', ' ', text)
plain = re.sub(r'\s+', ' ', plain)
for kw in ('swallow', 'grit', 'grift', '80', 'abrasive'):
    hits = [m.start() for m in re.finditer(r'(?i)' + re.escape(kw), plain)]
    print('KW', kw, len(hits))
    shown = set()
    for h in hits[:12]:
        seg = plain[max(0, h - 120):h + 160]
        if seg[:40] not in shown:
            shown.add(seg[:40])
            print('  ...', seg.strip()[:260])

# option/select values
for m in set(re.findall(r'<option[^>]*>([^<]{1,60})</option>', html)):
    s = m.strip()
    if s and not s.lower().startswith('select'):
        print('OPT:', s[:80])
