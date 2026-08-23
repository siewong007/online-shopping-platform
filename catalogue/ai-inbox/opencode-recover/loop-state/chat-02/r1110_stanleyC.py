import sys, os, re, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import rh, fetchlib as F

targets = [
    # (pos, code, [slugs])
    ("3363", "stmt60820-8", ["cushion-grip-screw-driver-standard-3mm-x-150-mm",
                             "cushion-grip-standard-screwdriver-3-x-150mm",
                             "cushion-grip-screw-driver-standard-3x150mm"]),
    ("3413", "stmt60823-8", ["cushion-grip-screw-driver-standard-5mm-x-150-mm",
                             "cushion-grip-standard-screwdriver-5-x-150mm",
                             "cushion-grip-screw-driver-standard-5x150mm"]),
]
hosts = ["https://my.stanleytools.global/product/", "https://asia.stanleytools.global/product/"]
final = {}
for pos, code, slugs in targets:
    done = False
    for h in hosts:
        if done:
            break
        for s in slugs:
            u = h + code + "/" + s
            raw, rec = rh.cache_page(pos, u)
            print(pos, u[:110], "->", rec.get("page_status"), rec.get("text_len"))
            if rec.get("page_status") == 200 and rec.get("text_len", 0) > 1200:
                txt = open(F.PAGECACHE + "\\" + pos + ".txt", encoding="utf-8", errors="ignore").read()
                tt = re.search(r"(?i)cushion[^\n]{0,90}", txt)
                print("   title:", tt.group(0)[:100] if tt else "?")
                done = True
                final[pos] = u
                break
            time.sleep(1)

# verify model strings + show images
import fetchlib as FL
for pos in final:
    nt = FL.norm_text(open(F.PAGECACHE + "\\" + pos + ".txt", encoding="utf-8", errors="ignore").read())
    want = {"3363": "3X150MM", "3413": "5X150MM"}[pos]
    print(pos, "gate-string", want, "present:", want in nt)
