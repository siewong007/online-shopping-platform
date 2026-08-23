import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
import urllib.request

for u in ["https://www.mitsubishielectric.com/fa/products/", "https://www.mitsubishielectric.com/fa/products"]:
    try:
        req = urllib.request.Request(u, headers=F.UA)
        r = urllib.request.urlopen(req, timeout=25)
        t = r.read(1200000).decode("utf-8", errors="ignore")
        print("OK", u, len(t))
        hits = [h for h in re.findall(r'href="([^"]+)"', t) if any(k in h.lower() for k in ["contactor", "starter"])]
        print(list(dict.fromkeys(hits))[:20])
        break
    except Exception as e:
        print("ERR", u, repr(e)[:110])
