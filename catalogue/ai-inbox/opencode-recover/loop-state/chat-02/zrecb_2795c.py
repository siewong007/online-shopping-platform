import sys, socket, os, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
CH = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36","Accept":"*/*"})
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.geturl(), r.read(8_000_000)
    except urllib.error.HTTPError as e:
        return e.code, url, b''
    except Exception as e:
        return -1, url, repr(e).encode()

s,f,raw = get('https://www.stguchi.com.my/my/en/sitemap.xml')
print('==', s, f, len(raw))
t = raw.decode('utf-8', errors='ignore')
open(os.path.join(CH,'tmp','z2795_sitemap.xml'),'w',encoding='utf-8').write(t)
locs = re.findall(r'<loc>([^<]+)</loc>', t)
print('n locs:', len(locs))
dv = [u for u in locs if 'viewer' in u.lower() or 'dv3776' in u.lower()]
for u in dv: print(u)
