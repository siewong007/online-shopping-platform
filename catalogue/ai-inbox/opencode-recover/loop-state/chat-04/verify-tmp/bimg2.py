import re, sys, io, html
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
raw = open(r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp\bimg.html', encoding='utf-8', errors='ignore').read()
print('len', len(raw))
print('murl raw count:', len(re.findall(r'murl', raw)))
print('iusc count:', len(re.findall(r'iusc', raw)))
print('mediaurl count:', len(re.findall(r'mediaurl', raw, re.I)))
# try any cdn1 occurrences
for m in list(dict.fromkeys(re.findall(r'https?://cdn1\.npcdn\.net[^"\'\\ )]+', raw)))[:10]:
    print('CDN:', m)
