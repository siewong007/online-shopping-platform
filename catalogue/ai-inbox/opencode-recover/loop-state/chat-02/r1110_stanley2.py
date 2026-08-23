import sys, socket, re, urllib.request
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u, n=2000000):
    r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=25)
    return r.read(n).decode("utf-8", errors="ignore")

rb = get("https://my.stanleytools.global/robots.txt")
print(rb)
sms = re.findall(r"Sitemap:\s*(\S+)", rb)
print("sitemaps:", sms)
for sm in sms[:3]:
    try:
        body = get(sm)
        locs = re.findall(r"<loc>([^<]+)</loc>", body)
        print(sm, "->", len(locs))
        for l in locs[:12]:
            print("   ", l[:120])
    except Exception as e:
        print(sm, "ERR", repr(e)[:80])
