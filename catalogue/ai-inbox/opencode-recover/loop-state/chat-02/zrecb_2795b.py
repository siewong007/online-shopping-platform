import sys, socket, os, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
CH = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36","Accept":"*/*","Accept-Language":"en-MY,en;q=0.9"})
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.geturl(), r.read(4_000_000)
    except urllib.error.HTTPError as e:
        return e.code, url, b''
    except Exception as e:
        return -1, url, repr(e).encode()

for u in ['https://www.stguchi.com.my/robots.txt',
          'https://www.stguchi.com.my/sitemap.xml',
          'https://www.stguchi.com.my/my/sitemap.xml']:
    s, f, raw = get(u)
    print('==', s, f, len(raw))
    if s == 200:
        t = raw.decode('utf-8', errors='ignore')
        print(t[:3000])
