import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\search1.html', encoding='utf-8').read()
links = re.findall(r'href="([^"]*)"[^>]*>([^<]{2,150})<', html)
seen = set()
for u, t in links:
    low = (u + ' ' + t).lower()
    if ('blade' in low or 'hacksaw' in low) and u.startswith('http'):
        if u not in seen:
            seen.add(u)
            print(u, '|', t.strip()[:110])
