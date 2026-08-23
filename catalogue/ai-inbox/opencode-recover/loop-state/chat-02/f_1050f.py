import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def raw(url):
    try:
        r = F._open(url)
        return r.status, r.read(600000).decode("utf-8", "ignore"), r.geturl()
    except Exception as e:
        return -1, repr(e)[:120], url

# 1) Bosny images
for u in ["https://www.bosny.com/wp-content/uploads/2023/08/1200-1.png"]:
    ev = F.fetch_image(3508, u)
    print("BOSNY img:", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len","image_content_type"]})

# 2) Cabana black shelf image
ev = F.fetch_image(2751, "https://www.cabana.com.my/images/virtuemart/product/CB474-BL-01.jpg")
print("CABANA img:", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len","image_content_type"]})

# 3) Hager EH711 contexts
st, h, fu = raw("https://hager.com/my/search?q=EH711")
idxs = [m.start() for m in re.finditer(r"EH711", h)]
print("HAGER hits:", len(idxs))
shown = set()
for i in idxs[:8]:
    seg = h[max(0,i-200):i+300]
    key = seg[180:220]
    if key in shown: continue
    shown.add(key)
    print("   ...", seg.replace("\n", " ")[:420])
