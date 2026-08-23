import sys, os, re, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

cands = [
    "https://asia.stanleytools.global/product/stmt60819-8/cushion-grip-standard-screwdriver-3-x-125mm",
    "https://in.stanleytools.global/product/stmt60819-8/cushion-grip-standard-screwdriver-3-x-125mm?tid=575901",
]
for u in cands:
    raw, rec = rh.cache_page("3486", u)
    print(u[:80], "->", rec.get("page_status"), rec.get("text_len"))
    if rec.get("page_status") == 200 and rec.get("text_len", 0) > 1200:
        txt = open(F.PAGECACHE + "\\3486.txt", encoding="utf-8", errors="ignore").read()
        nt = F.norm_text(txt)
        print("gate 3X125MM:", "3X125MM" in nt)
        m = re.search(r"(?i)cushion grip[^\n]{0,90}", txt)
        print("title:", m.group(0)[:110] if m else "?")
        avail = re.search(r"(?i)available in[^\n]{0,140}", txt)
        print("avail:", avail.group(0)[:150] if avail else "?")
        h = raw.decode("utf-8", errors="ignore")
        og = re.findall(r'property="og:image"\s+content="([^"]+)"', h)
        print("og:image:", og[:2])
        break
    time.sleep(1)
