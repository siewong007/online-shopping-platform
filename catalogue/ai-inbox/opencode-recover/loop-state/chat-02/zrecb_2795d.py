import sys, socket, os, re
socket.setdefaulttimeout(25)
CH = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
sys.path.insert(0, CH)
import fetchlib as F

POS='2795'
# purge stale cache first so precheck reflects THIS fetch
pf = os.path.join(F.PAGECACHE, POS + '.txt')
if os.path.exists(pf): os.remove(pf)
url = 'https://www.stguchi.com.my/my/en/products/door-fitting-accessories/door-viewer/sgac-dv3776'
rec = F.fetch_page(POS, url)
print('PAGE:', rec)
print('PRECHECK:', F.precheck_model_in_page(POS,'SGAC-DV3776','DOR-VIE-SGD-DV3776SN'))

import urllib.request
req = urllib.request.Request(url, headers=F.UA)
r = urllib.request.urlopen(req, timeout=25)
raw = r.read(4_000_000)
txt = raw.decode('utf-8', errors='ignore')
open(os.path.join(CH,'tmp','z2795_raw.html'),'w',encoding='utf-8').write(txt)
t = re.search(r'<title>(.*?)</title>', txt, re.S)
print('TITLE:', (t.group(1).strip() if t else '')[:200])
h1s = re.findall(r'<h1[^>]*>(.*?)</h1>', txt, re.S)
print('H1:', [re.sub(r'<[^>]+>','',x).strip()[:120] for x in h1s])
for m in re.finditer(r'<meta[^>]+(?:property|name)="(og:image|og:title|og:description)"[^>]+content="([^"]*)"', txt):
    print('OG:', m.group(1), '=', m.group(2)[:220])
