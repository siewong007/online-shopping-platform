import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\search2.html', encoding='utf-8').read()
seen = set()
for m in re.finditer(r'<a href="(https://www\.spear-and-jackson\.com/products/[^"]+)"[^>]*>(.*?)</a>', html, re.S):
    u = m.group(1)
    if u in seen:
        continue
    seen.add(u)
    t = ' '.join(re.sub(r'<[^>]+>', ' ', m.group(2)).split())
    print(u, '|', t[:120])
