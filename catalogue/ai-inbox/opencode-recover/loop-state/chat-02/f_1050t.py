import sys, socket, re, os, json, time
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

# 1) Hager image
ev = F.fetch_image(3212, "https://assets.hager.com/step-content/P/HA_16202658/11/std.lang.all/EH711.webp")
print("HAGER img:", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len","image_content_type"]})

# 2) UNI-T CDX last try
try:
    u = ("http://web.archive.org/cdx/search/cdx?url=uni-t.com&matchType=domain"
         "&filter=original:.*ut33.*&output=json&limit=30&collapse=urlkey")
    d = json.loads(F._open(u).read().decode("utf-8", "ignore"))
    print("UNIT cdx rows:", max(0, len(d) - 1))
    for r in d[1:8]:
        print("   ", r[1], r[2][:110])
except Exception as e:
    print("UNIT cdx fail:", repr(e)[:90])

# 3) Spear&Jackson Eclipse probe
for u in ["https://www.spearandjackson.com/search?q=eclipse%20hacksaw%20blade",
          "https://www.spearandjackson.com/products/hand-tools/cutting-tools"]:
    try:
        r = F._open(u)
        raw = r.read(400000).decode("utf-8", "ignore")
        hits = re.findall(r'href="(/[^"]*(?:hacksaw|blade)[^"]*)"', raw, re.I)
        print("S&J", r.status, u[:60], "| hits:", list(dict.fromkeys(hits))[:8])
    except Exception as e:
        print("S&J fail", repr(e)[:70], u[:60])
