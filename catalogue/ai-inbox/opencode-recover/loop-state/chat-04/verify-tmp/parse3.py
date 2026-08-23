import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\cat.html', encoding='utf-8').read()
# find product teasers: link + title
for m in re.finditer(r'<a href="(https://www\.spear-and-jackson\.com/products/[^"]+)"[^>]*>(.*?)</a>', html, re.S):
    u = m.group(1)
    t = re.sub(r'<[^>]+>', ' ', m.group(2))
    t = ' '.join(t.split())
    if len(t) > 3:
        print(u, '|', t[:120])
print('---- h2/h3 titles ----')
for m in re.finditer(r'<h[23][^>]*>(.*?)</h[23]>', html, re.S):
    t = ' '.join(re.sub(r'<[^>]+>', ' ', m.group(1)).split())
    print(t[:140])
