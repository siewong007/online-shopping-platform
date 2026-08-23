import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\sh.html', encoding='utf-8', errors='ignore').read()
print('len', len(raw), 'poncho hits:', raw.lower().count('poncho'))
links = list(dict.fromkeys(re.findall(r'href="(https://www\.senheng\.com\.my/product/[^"]+)"', raw)))
print('product links:', len(links))
for l in links[:12]:
    print(l)
imgs = list(dict.fromkeys(re.findall(r'(https?://[^"\' ]*npcdn[^"\' ]*)', raw)))
print('npcdn imgs:', len(imgs))
for i in imgs[:5]: print(i)
