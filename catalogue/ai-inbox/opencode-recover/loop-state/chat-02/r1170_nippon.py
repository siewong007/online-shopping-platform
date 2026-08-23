import re, sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

snap = "http://web.archive.org/web/20250423023102id_/https://www.nipponpaint.com.my/product/steel-wired-paint-brush/"
r = F.fetch_page("1176", snap)
print("archived:", r)
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1176.txt", encoding="utf-8", errors="ignore").read()
nt = F.norm_text(t)
print("N10:", "N10" in nt, "| TR880:", "TR880" in nt)
i = t.upper().find("STEEL")
print("title area:", t[max(0,i-100):i+400].replace("\n"," "))
# raw html for images
req = urllib.request.Request(snap.replace("id_/", "im_/"), headers=F.UA)
try:
    raw = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
    imgs = re.findall(r'(?:property="og:image"[^>]*content|data-src|src)="([^"]+(?:uploads|product)[^"]+\.(?:jpg|jpeg|png|webp))"', raw, re.I)
    imgs = [u for u in dict.fromkeys(imgs) if "navigation" not in u.lower()]
    print("imgs:", imgs[:12])
except Exception as e:
    print("raw err", repr(e)[:120])
