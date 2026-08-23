import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20)
        return r.status, r.geturl(), r.read(700000).decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        return e.code, u, ""
    except Exception as e:
        return -1, u, repr(e)[:60]

for n in range(600, 640):
    code = f"stmt608{n:02d}-8"
    st, fu, h = get(f"https://my.stanleytools.global/product/{code}")
    if st == 200 and "<title>" in h.lower():
        m = re.search(r"<title>([^<]{4,140})", h, re.I)
        t = re.sub(r"\s+", " ", m.group(1)).strip() if m else "?"
        print(code, "|", t[:120])
