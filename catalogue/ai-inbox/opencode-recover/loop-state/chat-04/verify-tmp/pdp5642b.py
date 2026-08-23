import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\pdp5642.html', encoding='utf-8', errors='ignore').read()
imgs = re.findall(r'(?:src|data-src|content)="(https?://[^"]+\.(?:jpe?g|png|webp)[^"]*)"', raw)
seen=[]
for i in imgs:
    if i not in seen:
        seen.append(i)
print('total unique product-ish imgs:', len(seen))
for s in seen[:25]:
    print(s[:190])
