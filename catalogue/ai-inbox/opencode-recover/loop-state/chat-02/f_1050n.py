import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# Bahco NP-19 T4 revival via Wayback
pdp = "http://web.archive.org/web/20210304062854/https://www.bahco.com/pl_pl/uniwersalna-pila-reczna-np-19-u7-8-hp.html"
print("fetch:", F.fetch_page(3070, pdp))
print("precheck:", safe_precheck(3070, "NP-19", "CUT-SAW-BAH-20"))
t = open(os.path.join(F.PAGECACHE, "3070.txt"), encoding="utf-8", errors="ignore").read()
i = t.upper().find("NP-19")
print("ctx:", t[max(0,i-120):i+200].replace("\n"," "))
print("BAHCO brand in text:", t.upper().count("BAHCO") > 0)

for img in ["https://www.bahco.com/uploads/np-19-u7_8-hp.png",
            "http://web.archive.org/web/20181108052609id_/https://www.bahco.com/uploads/np-19-u7_8-hp.png"]:
    ev = F.fetch_image(3070, img)
    print("img try:", img[:70], "->", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len","image_content_type"]})
    if ev.get("image_bytes_len", 0) >= 20000 and ev.get("px_w", 0) >= 500:
        break
