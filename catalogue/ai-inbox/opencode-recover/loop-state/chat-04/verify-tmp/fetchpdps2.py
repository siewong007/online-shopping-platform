import urllib.request, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
urls = [
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/small-saw-blades/general-purpose-saw-spare-blade',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/saw-frames/junior-hacksaw',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/saw-frames/mini-saw',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/saw-frames/handyman-hacksaw',
]
for u in urls:
    try:
        req = urllib.request.Request(u, headers=UA)
        r = urllib.request.urlopen(req, timeout=60)
        html = r.read().decode('utf-8', 'ignore')
        name = u.rsplit('/', 1)[1]
        open(base + '\\' + name + '.html', 'w', encoding='utf-8').write(html)
        title = re.search(r'<title>(.*?)</title>', html, re.S)
        imgs = sorted(set(re.findall(r'(?:src|href)="(https://www\.spear-and-jackson\.com/files/[^"]*product-images[^"]*)"', html)))
        has11 = [x for x in imgs if '/product-images_11' in x]
        bodytext = ' '.join(re.sub(r'<[^>]+>', ' ', html).split())
        sixhits = [s for s in re.findall(r'[^.]*?(?:6\s*(?:in|&quot;|"|inch)|150\s*mm)[^.]*', bodytext, re.I)][:8] if False else None
        print('=' * 10, name)
        print('TITLE:', ' '.join(title.group(1).split()) if title else '?')
        print('HAS _11:', bool(has11))
        for x in imgs[:12]:
            print('  IMG:', x)
        # print size mentions
        idx = 0
        cnt = 0
        low = bodytext.lower()
        for kw in ['6&quot;', '6"', '6 in', '6in', '150mm', '150 mm']:
            j = 0
            while True:
                k = low.find(kw.lower(), j)
                if k == -1 or cnt > 14:
                    break
                print('  MENTION:', bodytext[max(0,k-70):k+70])
                j = k + len(kw)
                cnt += 1
            if cnt > 14:
                break
    except Exception as e:
        print(u, 'ERR', repr(e))
