import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

st_raw = F._open("https://hager.com/au/search?q=EH711").read(900000).decode("utf-8", "ignore")
m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', st_raw, re.S)
d = json.loads(m.group(1))
txt = json.dumps(d)
hits = re.findall(r'\{"flag":[^{}]*?"commercialRef":"EH711"[^{}]*?\}', txt)
for hjson in hits[:3]:
    h = json.loads(hjson)
    print("HIT:", h.get("name"), "|", h.get("short_description"), "|", h.get("url_key"), "|", h.get("image_url"))

# canonical PDP + gate
pdp = "https://hager.com/au/products/eh711-weekly-time-switch"
uk = [json.loads(x).get("url_key") for x in hits]
if uk:
    pdp = "https://hager.com/au/" + uk[0]
print("PDP:", pdp)
print("fetch:", F.fetch_page(3212, pdp))
print("precheck:", safe_precheck(3212, "EH711", "TIM-BUI-HAG-EH711"))
t = open(os.path.join(F.PAGECACHE, "3212.txt"), encoding="utf-8", errors="ignore").read()
i = t.upper().find("EH711")
print("ctx:", t[max(0,i-120):i+220].replace("\n"," "))
