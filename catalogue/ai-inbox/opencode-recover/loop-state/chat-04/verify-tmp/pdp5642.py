import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\pdp5642.html', encoding='utf-8', errors='ignore').read()
print('len', len(raw))
print('npcdn count:', raw.count('npcdn'))
for m in list(dict.fromkeys(re.findall(r'https?://[^"\' ]*npcdn[^"\' ]+', raw)))[:12]:
    print('IMG:', m[:180])
t = re.search(r'<title>([^<]*)</title>', raw)
print('TITLE:', t.group(1) if t else None)
# og:image
og = re.search(r'property="og:image" content="([^"]+)"', raw)
print('OG:', og.group(1)[:180] if og else None)
# green mentions
print('green hits:', len(re.findall(r'green', raw, re.I)))
# price
pr = re.search(r'(RM\s?[\d.,]+)', raw)
print('price:', pr.group(1) if pr else None)
