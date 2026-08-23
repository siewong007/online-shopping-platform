import sys, socket, re
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

# pos 5343 HE4252 official hardexworld page
r = F.fetch_page("5343", "https://www.hardexworld.com/?cat=REPAIR-MAINTENANCE&products_id=2553252&ws=showproducts&lang=en")
print("5343", r)
p = F.PAGECACHE + "\\5343.txt"
txt = open(p, encoding="utf-8", errors="ignore").read()
print("precheck5343:", F.precheck_model_in_page("5343", "HE4252", "GUM-HAR-HE4252"))
imgs = re.findall(r'https?://[^\s"\']+?\.(?:jpg|jpeg|png|webp)[^\s"\']*', txt)
for i in imgs[:15]:
    print("IMG:", i)
