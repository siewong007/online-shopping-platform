import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\cat_hand-hacksaw-blades.html', encoding='utf-8').read()
for m in set(re.findall(r'"([^"]*product-images[^"]*)"', html)):
    print('IMGREF:', m)
# product links in listing
seen = set()
for m in re.finditer(r'<a href="(https://www\.spear-and-jackson\.com/products/[^"]+)"', html):
    u = m.group(1)
    if u not in seen:
        seen.add(u)
        print(u)
