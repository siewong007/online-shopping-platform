import sys, socket, re, os
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# --- Bosny: inspect cached text ---
txt = open(os.path.join(F.PAGECACHE, "3508.txt"), encoding="utf-8", errors="ignore").read()
print("B136 occurrences:", txt.upper().count("B136"))
for m in re.finditer(r"B136", txt):
    print("   ...", txt[max(0,m.start()-80):m.start()+60].replace("\n", " "))
print("precheck(B136):", safe_precheck(3508, "B136", "SPRA-BOSNY-B136-400CC"))

# --- Cabana cb474-detail (pos 2751) ---
p = "https://www.cabana.com.my/index.php/sorento/bathroom/bathroom-accessories/shelf/cb474-detail"
print("== cabana fetch:", F.fetch_page(2751, p))
ctxt = open(os.path.join(F.PAGECACHE, "2751.txt"), encoding="utf-8", errors="ignore").read()
print("CB474 count:", ctxt.upper().count("CB474"), "| BLK:", "BLK" in ctxt.upper(), "| L350:", "L350" in ctxt)
i = ctxt.upper().find("CB474")
print("ctx:", ctxt[max(0,i-100):i+250].replace("\n"," "))
print("precheck(CB474):", safe_precheck(2751, "CB474", "SHE-CAB-CB474-BLK"))
st_raw = F._open(p).read(500000).decode("utf-8","ignore")
imgs = re.findall(r'<img[^>]+src="([^"]+virtuemart[^"]+)"', st_raw)
imgs += re.findall(r'"(https?://www\.cabana\.com\.my/images/virtuemart/product/[^"]+)"', st_raw)
print("imgs:", list(dict.fromkeys(imgs))[:12])
