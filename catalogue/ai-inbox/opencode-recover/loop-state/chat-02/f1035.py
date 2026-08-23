import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

r = F.fetch_page(1035, "https://truflo.com.my/product/bib-tap-hose-g503b")
print("page:", r, flush=True)
ok = F.precheck_model_in_page(1035, "3/4B", "BIB-G503B")
print("precheck:", ok, flush=True)
import os, re
p = os.path.join(F.PAGECACHE, "1035.txt")
if os.path.exists(p):
    t = open(p, encoding="utf-8").read()
    print("TEXTLEN", len(t))
    print(t[:1500])
