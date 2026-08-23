import re, sys, io, json, html
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\bimg.html', encoding='utf-8', errors='ignore').read()
murls = re.findall(r'"murl":"(https?://[^"]+)"', raw)
found = [html.unescape(u) for u in murls if 'npcdn' in u or 'poncho' in u.lower()]
seen = []
for u in found:
    if u not in seen:
        seen.append(u)
print('npcdn/poncho murls:', len(seen))
for u in seen[:20]:
    print(u[:200])
print('--- all hosts ---')
hosts = {}
for u in murls:
    h = re.match(r'https?://([^/]+)', html.unescape(u)).group(1)
    hosts[h] = hosts.get(h, 0) + 1
for h, c in sorted(hosts.items(), key=lambda x: -x[1])[:25]:
    print(h, c)
