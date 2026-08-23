import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# Hager AU download center EH711 docs
try:
    raw = F._open("https://hager.com/au/download-center/search?q=EH711").read(900000).decode("utf-8", "ignore")
    pdfs = re.findall(r'"url"\s*:\s*"(https://assets\.hager\.com[^"]+\.pdf)"', raw)
    titles = re.findall(r'"title"\s*:\s*"([^"]{0,80})"', raw)
    print("pdfs:", list(dict.fromkeys(pdfs))[:10])
except Exception as e:
    print("dc fail", repr(e)[:90]); pdfs = []

for p in list(dict.fromkeys(pdfs))[:4]:
    rec = F.fetch_page(3212, p.replace("\\u0026", "&"))
    print("pdf fetch:", rec.get("page_status"), rec.get("text_len"), p[-70:])
    if rec.get("text_len", 0) > 100 and safe_precheck(3212, "EH711", "TIM-BUI-HAG-EH711"):
        t = open(os.path.join(F.PAGECACHE, "3212.txt"), encoding="utf-8", errors="ignore").read()
        i = t.upper().find("EH711")
        print("PRECHECK TRUE | ctx:", t[max(0,i-100):i+160].replace("\n"," "))
        break
