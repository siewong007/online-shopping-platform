import sys, socket, os, re, json
socket.setdefaulttimeout(25)
CH = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
sys.path.insert(0, CH)
import fetchlib as F

POS='2795'
url = 'https://www.stguchi.com.my/my/en/products/door-viewer/sgac-dv3776'
rec = F.fetch_page(POS, url)
print('PAGE:', rec)
ok = F.precheck_model_in_page(POS, 'SGAC-DV3776', 'DOR-VIE-SGD-DV3776SN')
print('PRECHECK:', ok)

# get raw html separately for og:image extraction
import urllib.request
req = urllib.request.Request(url, headers=F.UA)
try:
    r = urllib.request.urlopen(req, timeout=25)
    raw = r.read(3_000_000)
    print('RAW status', r.status, 'final', r.geturl(), 'len', len(raw))
    txt = raw.decode('utf-8', errors='ignore')
    open(os.path.join(CH,'tmp','z2795_raw.html'),'w',encoding='utf-8').write(txt)
    for m in re.finditer(r'<meta[^>]+property="og:(image|title|description)"[^>]+content="([^"]*)"', txt):
        print('OG:', m.group(1), '=', m.group(2)[:200])
    # title
    t = re.search(r'<title>(.*?)</title>', txt, re.S)
    print('TITLE:', (t.group(1).strip() if t else '')[:200])
except Exception as e:
    print('RAWERR', repr(e))
