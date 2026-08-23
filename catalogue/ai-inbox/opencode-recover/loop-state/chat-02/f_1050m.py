import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# --- Hager AU: full product-hit objects ---
st_raw = F._open("https://hager.com/au/search?q=EH711").read(900000).decode("utf-8", "ignore")
i = st_raw.find('"commercialRef":"EH711"')
while i != -1:
    seg = st_raw[max(0, i - 900): i + 200]
    j = seg.rfind('{"flag"')
    if j != -1:
        blob = seg[j:]
        print("HITBLOB:", blob[:700].replace("\\u0026", "&"))
        print("---")
    i = st_raw.find('"commercialRef":"EH711"', i + 1)

# --- Hager PDP pattern probes ---
for u in ["https://hager.com/au/product-information/eh711-time-switch-72x72-24h-reserve/",
          "https://www.hager.com/au/product-information/eh711-time-switch-72x72-24h-reserve",
          "https://hager.com/au_en/product-information/eh711-time-switch-72x72-24h-reserve"]:
    try:
        r = F._open(u)
        print("PDP OK:", r.status, r.geturl())
        break
    except Exception as e:
        print("PDP fail:", repr(e)[:80], u[:90])
