import sys, os, re, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

snaps = [
    "http://web.archive.org/web/20260519000700id_/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553251&cat=REPAIR-MAINTENANCE&lang=en",
    "http://web.archive.org/web/20221206001217/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553251&cat=REPAIR-MAINTENANCE",
    "http://web.archive.org/web/20260519000700/https://www.hardexworld.com/index.php?ws=showproducts&products_id=2553251&cat=REPAIR-MAINTENANCE&lang=en",
]
raw = None
for s in snaps:
    raw, rec = rh.cache_page("5342", s)
    print(s[-60:], "->", rec.get("page_status"), rec.get("text_len"))
    if rec.get("page_status") == 200 and rec.get("text_len", 0) > 500:
        break
    time.sleep(4)

if raw:
    txt = open(F.PAGECACHE + "\\5342.txt", encoding="utf-8", errors="ignore").read()
    m = re.search(r"HE\s*425[12][^\n]{0,90}", txt)
    print("title ctx:", m.group(0)[:120] if m else "?")
    print("precheck HE4251:", rh.precheck("5342", "HE4251"))
    cands = [rh.resolve(i, snaps[0]) for i in rh.imgs_in_html(raw)]
    prod = [u for u in cands if "npcdn.net/image/" in u and "logo" not in u.lower()]
    seen = set()
    for u in prod[:12]:
        k = u.split("?")[0]
        if k not in seen:
            seen.add(k)
            print("IMG:", u[:170])
