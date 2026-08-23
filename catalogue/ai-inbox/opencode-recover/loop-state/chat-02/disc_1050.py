import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.5", "Accept-Language": "en-MY,en;q=0.9"}

def get(url, n=400):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25)
        raw = r.read(200000)
        ct = (r.headers.get("Content-Type") or "")[:40]
        txt = raw.decode("utf-8", "ignore")
        title = re.search(r"<title[^>]*>(.*?)</title>", txt, re.S | re.I)
        print("OK", r.status, url[:100], "| ct:", ct.strip(), "| title:", (title.group(1)[:80] if title else "-"))
        return txt
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, url[:100]); return ""
    except Exception as e:
        print("ERR", repr(e)[:70], url[:90]); return ""

probes = [
    "https://www.cabana.com.my/",
    "https://www.mrmarktools.com/",
    "https://www.uni-t.com/",
    "https://www.bahco.com/int/",
    "https://www.bosny.com/",
    "https://www.hager.com/",
]
for p in probes:
    get(p)
    print()
