import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
from fetchlib import _open

raw = _open("https://www.jllelectrical.com.my/tag/tag_id/46034,197855/").read(4_000_000).decode("utf-8", "ignore")
i = raw.find("M074W")
seg = raw[max(0, i - 4000): i + 500]
print("LINKS:")
for m in re.findall(r'href="([^"]*showproducts[^"]*)"', seg):
    print(" ", m)
imgs = re.findall(r'(https://cdn1\.npcdn\.net/[^"\s\\]+)', seg)
print("IMGS NEAR:")
for x in imgs[-8:]:
    print(" ", x[:170])
