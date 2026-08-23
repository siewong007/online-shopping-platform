import sys, os, re
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

# pos 5342 HE4251 archived PDP
snap = "http://web.archive.org/web/20260519000700/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553251&cat=REPAIR-MAINTENANCE&lang=en"
raw, rec = rh.cache_page("5342", snap)
print("5342 page:", rec)
print("precheck HE4251:", rh.precheck("5342", "HE4251"))
txt = open(F.PAGECACHE + "\\5342.txt", encoding="utf-8", errors="ignore").read()
import re as _re
m = _re.search(r"HE\s*425[12][^\n]{0,90}", txt)
print("title ctx:", m.group(0) if m else "?")
cands = [rh.resolve(i, snap) for i in rh.imgs_in_html(raw)]
prod = [u for u in cands if "npcdn.net/image/" in u and "logo" not in u.lower() and "ads-" not in u]
for u in prod[:10]:
    print("IMG:", u)
