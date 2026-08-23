import urllib.request, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
queries = ['junior+hacksaw+blade', 'blade', 'eclipse+6', 'hacksaw']
allurls = set()
for q in queries:
    try:
        url = 'https://www.spear-and-jackson.com/search/node/' + q
        req = urllib.request.Request(url, headers=UA)
        r = urllib.request.urlopen(req, timeout=60)
        html = r.read().decode('utf-8', 'ignore')
        for m in re.finditer(r'href="(https://www\.spear-and-jackson\.com/products/[^"]+)"[^>]*>([^<]*)<', html):
            allurls.add((m.group(1), ' '.join(m.group(2).split())))
    except Exception as e:
        print(q, 'ERR', repr(e))
for u, t in sorted(allurls):
    print(u, '|', t[:110])
