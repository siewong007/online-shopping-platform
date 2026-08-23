import re, sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_me_products.html", encoding="utf-8", errors="ignore").read()
m = [h for h in re.findall(r'href="([^"]+)"', t) if re.search(r"(?i)(discontinu|alternativ)", h)]
print(list(dict.fromkeys(m))[:15])
