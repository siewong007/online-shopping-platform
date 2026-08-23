import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
base = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp'
html = open(base + r'\cat_hand-hacksaw-blades.html', encoding='utf-8').read()
i = html.find('product-images_1244')
print(html[max(0,i-1500):i+800])
