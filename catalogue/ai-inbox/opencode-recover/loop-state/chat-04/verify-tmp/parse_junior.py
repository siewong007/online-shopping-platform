import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\junior-saw-blades.html', encoding='utf-8').read()
text = ' '.join(re.sub(r'<script.*?</script>', ' ', html, flags=re.S).split())
text = re.sub(r'<[^>]+>', ' ', text)
text = ' '.join(text.split())
# find the main product description region
i = text.find('Junior Saw Blades')
print(text[i:i+2500])
print('---- mentions of 6/150/eclipse ----')
for kw in ['6', '150', 'clipse', 'TPI', 'steel']:
    pass
for m in re.finditer(r'[^|]{0,120}(?:6in|6&quot;|6"|6 inch|150mm|150 mm)[^|]{0,120}', text, re.I):
    print('HIT:', m.group(0)[:200])
