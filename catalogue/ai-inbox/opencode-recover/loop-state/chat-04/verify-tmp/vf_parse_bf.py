import re, sys
p = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\bf_search.html'
txt = open(p, 'rb').read().decode('utf-8', 'replace')
links = sorted(set(re.findall(r'https://mybutterfly\.com\.my/product/[^"\'<> ]+', txt)))
print(len(links))
for l in links[:80]:
    print(l)
