import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
xml = open(base + r'\sitemap.xml', encoding='utf-8').read()
urls = re.findall(r'<loc>([^<]+)</loc>', xml)
print('TOTAL', len(urls))
for u in urls:
    if '/metal-cutting/' in u:
        print(u)
