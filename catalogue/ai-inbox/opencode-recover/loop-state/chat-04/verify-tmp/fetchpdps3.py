import urllib.request, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
urls = [
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/small-saw-blades/junior-saw-blades',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/hand-hacksaw-blades/all-hard-hss-hand-hacksaw',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/hand-hacksaw-blades/flexible-silicon-shatterproof',
    'https://www.spear-and-jackson.com/products/eclipse-professional-tools/metal-cutting/small-saw-blades/padsaw-metalwood-blades',
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
        print('=' * 10, name)
        print('TITLE:', ' '.join(title.group(1).split()) if title else '?')
        for x in imgs:
            tag = ' <== _11' if '/product-images_11' in x else ''
            print('  IMG:', x + tag)
    except Exception as e:
        print(u, 'ERR', repr(e))
