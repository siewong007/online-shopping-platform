import re, sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_cabana_search.html", encoding="utf-8", errors="ignore").read()
print("len", len(t))
for m in re.finditer(r'href="([^"]*)"', t):
    h = m.group(1)
    if "781" in h.upper():
        print("LINK:", h[:140])
idx = [m.start() for m in re.finditer(r"781", t)]
for i in idx[:12]:
    print("CTX:", t[max(0, i - 180):i + 100].replace("\n", " ")[:300])
    print("---")

# full-size image variants on live host (sibling pattern CB476-BL-01.jpg)
for u in ["https://www.cabana.com.my/images/virtuemart/product/CB781-BL.jpg",
          "https://www.cabana.com.my/images/virtuemart/product/CB781-BL-01.jpg"]:
    ev = F.fetch_image("1197", u)
    print(u, ev.get("image_status"), ev.get("px_w"), ev.get("px_h"), ev.get("image_bytes_len"))
