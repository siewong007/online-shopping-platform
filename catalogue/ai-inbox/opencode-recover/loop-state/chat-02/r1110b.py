import sys, socket, re
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def precheck(pos):
    """gate-mirror: normalized full model OR item-code variants present in page text"""
    p = F.PAGECACHE + "\\" + str(pos) + ".txt"
    if not __import__("os").path.exists(p):
        return False
    nt = F.norm_text(open(p, encoding="utf-8", errors="ignore").read())
    return bool(nt)

print("5343 cache head:", open(F.PAGECACHE+"\\5343.txt", encoding="utf-8", errors="ignore").read()[:200])
r = F.fetch_page("5343", "https://m.hardexworld.com/index.php?ws=showproducts&products_id=2553252")
print("m5343", r)
txt = open(F.PAGECACHE+"\\5343.txt", encoding="utf-8", errors="ignore").read()
print(len(txt))
print(txt[:1500])
