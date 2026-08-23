import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

pdp = "https://hager.com/au/product-information/eh711-time-switch-72x72-24h-reserve"
print("fetch:", F.fetch_page(3212, pdp))
print("precheck:", safe_precheck(3212, "EH711", "TIM-BUI-HAG-EH711"))
t = open(os.path.join(F.PAGECACHE, "3212.txt"), encoding="utf-8", errors="ignore").read()
i = t.upper().find("EH711")
print("ctx:", t[max(0,i-100):i+200].replace("\n"," "))
ev = F.fetch_image(3212, "https://assets.hager.com/step-content/P/HA_16202658/11/std.lang.all/EH711.webp")
print("img:", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len","image_content_type"]})
