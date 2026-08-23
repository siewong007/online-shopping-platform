import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from mine960 import imgs

pos = 984
page = "https://www.jllelectrical.com.my/showproducts/productid/3172589/retouch-ultra-rimless-ultra-1-gang-cat5e-data-outlet-rj45-whitetexture-goldmatte-grey/"
print(F.fetch_page(pos, page))
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\984.txt", encoding="utf-8", errors="ignore").read()
n = re.sub(r"[^0-9A-Za-z]+", "", t).upper()
print("M074W:", "M074W" in n)
imgs(page)
