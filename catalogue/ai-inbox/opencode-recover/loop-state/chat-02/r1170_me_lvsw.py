import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
import urllib.request

u = "https://www.mitsubishielectric.com/fa/products/lvd/lvsw/index.html"
req = urllib.request.Request(u, headers=F.UA)
t = urllib.request.urlopen(req, timeout=25).read(1500000).decode("utf-8", errors="ignore")
open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_me_lvsw.html", "w", encoding="utf-8").write(t)
print(len(t))
print("SC-N2S mentions:", len(re.findall(r"(?i)sc[\s\-]?n2s", t)))
hits = [h for h in re.findall(r'href="([^"]+)"', t) if re.search(r"(?i)(sc[0-9]|magnetic|contactor)", h)]
print(list(dict.fromkeys(hits))[:25])
idx = [m.start() for m in re.finditer(r"(?i)magnetic contactor|SC-N2S", t)]
for i in idx[:5]:
    print("CTX:", t[max(0, i - 200):i + 250].replace("\n", " ")[-420:])
    print("---")
