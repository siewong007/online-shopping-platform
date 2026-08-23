import sys, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh

snap = "http://web.archive.org/web/20260519012539/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553252&cat=REPAIR-MAINTENANCE&lang=en"
raw, rec = rh.cache_page("5343", snap)
print(rec)
print("precheck HE4252:", rh.precheck("5343", "HE4252"))
for i in rh.imgs_in_html(raw)[:25]:
    print("IMG:", rh.resolve(i, snap))
# find HE4251 products_id link in html
import re
h = raw.decode("utf-8", errors="ignore")
for m in re.finditer(r'products_id=(\d+)[^"\']*"[^>]*>([^<]*4251[^<]*)', h):
    print("HE4251 LINK:", m.group(1), m.group(2)[:80])
for m in re.finditer(r'4251', h):
    s = max(0, m.start()-160)
    print("CTX:", h[s:m.start()+60].replace("\n", " ")[-200:])
    break
