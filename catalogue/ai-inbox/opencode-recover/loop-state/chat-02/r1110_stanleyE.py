import sys, os, re, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

u = "https://my.stanleytools.global/product/stmt60819-8/cushion-grip-standard-screwdriver-3-x-125mm"
raw, rec = rh.cache_page("3486", u)
print("3486 page:", rec.get("page_status"), rec.get("text_len"))
if rec.get("page_status") == 200:
    txt = open(F.PAGECACHE + "\\3486.txt", encoding="utf-8", errors="ignore").read()
    nt = F.norm_text(txt)
    print("gate-string 3X125MM present:", "3X125MM" in nt)
    m = re.search(r"(?i)cushion grip[^\n]{0,80}", txt)
    print("title:", m.group(0)[:100] if m else "?")
    imgs = rh.imgs_in_html(raw)
    og = re.findall(r'property="og:image"\s+content="([^"]+)"', raw.decode("utf-8", errors="ignore"))
    print("og:image:", og[:3])
    seen = set()
    for i in imgs:
        i2 = i.split("?")[0]
        if i2 in seen:
            continue
        seen.add(i2)
        if any(k in i2.lower() for k in (".jpg", ".png", ".webp")) and "logo" not in i2.lower():
            print("IMG:", rh.resolve(i, u)[:160])
