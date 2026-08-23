import urllib.request, ssl, re, sys

sys.stdout.reconfigure(errors='replace')
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36'}

for pg in ['', '&page=2']:
    u = 'https://cheongseng.com.my/index.php?ws=ourproducts&cid=364531&cat=Car%20Paint&subcat=Tapes-Sandpapers' + pg
    html = urllib.request.urlopen(urllib.request.Request(u, headers=HDR), timeout=90, context=ctx).read().decode('utf-8', 'ignore')
    # product links typically contain ws=ourproducts&pfid= or prodid
    for l in set(re.findall(r'href=["\']([^"\']+)["\'][^>]*>([^<]{0,120})', html)):
        href, txt = l
        if re.search(r'(?i)(swallow|sand)', href + ' ' + txt):
            print('LINK:', href.strip()[:200], '|', txt.strip()[:100])
    # also raw swallow mentions
    for m in re.finditer(r'(?i)swallow', html):
        seg = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html[max(0, m.start() - 200):m.start() + 300]))
        print('CTX:', seg[:280])
