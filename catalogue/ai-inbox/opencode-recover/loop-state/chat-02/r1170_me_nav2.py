import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
import urllib.request

u = "https://www.mitsubishielectric.com/fa/products/"
req = urllib.request.Request(u, headers=F.UA)
t = urllib.request.urlopen(req, timeout=25).read(1200000).decode("utf-8", errors="ignore")
open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_me_products.html", "w", encoding="utf-8").write(t)
idx = [m.start() for m in re.finditer(r"[Cc]ontactor", t)]
print("mentions:", len(idx))
for i in idx[:6]:
    print("CTX:", t[max(0, i - 300):i + 150].replace("\n", " ")[-380:])
    print("---")
# any href at all near mentions
for i in idx[:3]:
    seg = t[i:i + 600]
    print("HREFS:", re.findall(r'href="([^"]+)"', seg)[:6])
