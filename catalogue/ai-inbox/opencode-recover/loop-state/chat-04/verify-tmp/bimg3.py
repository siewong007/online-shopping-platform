import re, sys, io, html, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\bimg.html', encoding='utf-8', errors='ignore').read()
# m attribute JSON in iusc anchors
metas = re.findall(r'm="(\{[^"]+\})"', raw)
print('m metas:', len(metas))
for mm in metas[:60]:
    try:
        s = html.unescape(mm).replace('&quot;', '"').replace('&amp;', '&')
        d = json.loads(s)
        mu = d.get('murl', '')
        purl = d.get('purl', '')
        if mu or purl:
            print('IMG:', mu[:120])
            print('  PG:', purl[:140])
    except Exception as e:
        pass
