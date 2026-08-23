import urllib.request, re, ssl, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

h = get("http://eupro.com/index.php?p=hook")
print(len(h))
low = h.lower()
for p in ["1920", "6/0", "ss"]:
    idxs = [m.start() for m in re.finditer(p, low)][:4]
    print("pat", p, len(idxs))
    for i in idxs[:2]:
        print("   ", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", h[max(0,i-120):i+160]))[:220])
imgs = list(dict.fromkeys(re.findall(r'(?:src|href)="([^"]+\.(?:jpg|png|jpeg))"', h)))
print(imgs[:25])
