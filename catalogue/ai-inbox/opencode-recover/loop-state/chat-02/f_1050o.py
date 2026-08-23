import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# sanity: does MY ehn711-style path work? then try AU products/ variant
for u in ["https://hager.com/my/products/ehn711-time-switch-72x72-24h-reserve",
          "https://hager.com/au/products/eh711-time-switch-72x72-24h-reserve",
          "https://hager.com/au/product-information/eh711-time-switch-72x72-24h-reserve"]:
    try:
        r = F._open(u)
        print("OK", r.status, u)
        pdp = u
        break
    except Exception as e:
        print("fail", repr(e)[:60], u[:80])
        pdp = None

if pdp:
    print("fetch:", F.fetch_page(3212, pdp))
    print("precheck:", safe_precheck(3212, "EH711", "TIM-BUI-HAG-EH711"))
    t = open(os.path.join(F.PAGECACHE, "3212.txt"), encoding="utf-8", errors="ignore").read()
    idx = t.upper().find("EH711")
    print("ctx:", t[max(0,idx-100):idx+200].replace("\n"," ") if idx != -1 else "(no EH711)")
