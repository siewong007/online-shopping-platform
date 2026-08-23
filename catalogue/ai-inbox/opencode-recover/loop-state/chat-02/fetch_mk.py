import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
import re

pos = 980
page = "https://www.zhongtrading.com.my/showproducts/productid/4437951/mk-13-amp-single-metal-clad-switch-socket-g2977/"
img = "https://cdn1.npcdn.net/images/868af675e5f27e68390b10dd6bd7f9ff_1683508628.webp?md5id=ef95e8a96e7ae66d9a053c3fb85f7230&new_width=1000&new_height=1000&size=max&w=1681353502&from=jpeg"

print(F.fetch_page(pos, page))
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\980.txt", encoding="utf-8", errors="ignore").read()
n = re.sub(r"[^0-9A-Za-z]+", "", t).upper()
print("G2977:", "G2977" in n)
ev = F.fetch_image(pos, img, 1)
print(ev)
