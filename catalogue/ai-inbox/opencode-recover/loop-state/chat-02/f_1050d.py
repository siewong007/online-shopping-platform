import sys, socket, re, os
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

def raw(url):
    try:
        r = F._open(url)
        return r.status, r.read(500000).decode("utf-8", "ignore"), r.geturl()
    except Exception as e:
        return -1, repr(e)[:80], url

# 1) Bosny image candidates
st, h, fu = raw("https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/")
og = re.findall(r'property="og:image"[^>]+content="([^"]+)"', h)
imgs = re.findall(r'<img[^>]+src="([^"]+uploads[^"]+)"', h)
print("BOSNY og:", og, "| uploads:", list(dict.fromkeys(imgs))[:6])

# 2) Cabana cb474-bl-detail exploration (plain, not cached yet)
for u in ["https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb474-bl-detail"]:
    st, h2, fu2 = raw(u)
    t2 = F.html_to_text(h2.encode())
    print("CB474-BL page:", st, "| title-ish:", re.search(r"CB474[-\s]*BL", t2.upper()) is not None)
    print("   BLACK mention:", len(re.findall(r"BLACK|HITAM", t2.upper())), "| BLUE mention:", len(re.findall(r"\bBLUE\b|BIRU", t2.upper())))
    i = t2.upper().find("CB474")
    print("   ctx:", t2[max(0,i-60):i+200].replace("\n"," "))
    vi = re.findall(r'/images/virtuemart/product/(resized/)?(CB[\w.-]+\.jpg)', h2)
    print("   vmimgs:", vi[:8])

# cabana keyword search for BLK/GM variants
for kw in ["CB474-B", "shelf"]:
    st, h3, fu3 = raw(f"https://www.cabana.com.my/index.php/component/virtuemart/results,1-?search=true&Itemid=0&keyword={kw}")
    names = set(re.findall(r'(CB47[14][\w-]*)', h3.upper()))
    links = set(re.findall(r'href="(/index\.php/[\w/-]*cb47[\w/-]*detail)"', h3))
    print(f"CABANA kw={kw}:", st, "skus:", sorted(names), "links:", sorted(links))

# 3) UNI-T UT33B+ probes
for u in ["https://instruments.uni-trend.com/product/ut33b-plus/",
          "https://www.uni-trend.com/products/digital-multimeters/ut33b-plus",
          "https://instruments.uni-trend.com/products/digital-multimeters/?s=UT33B"]:
    st, h4, fu4 = raw(u)
    tt = re.search(r"<title[^>]*>(.*?)</title>", h4, re.S)
    print("UNIT", st, u[:80], "| title:", (tt.group(1)[:70] if tt else "-"))

# 4) Hager MY search EH711
for q in ["EH711", "q=EH711", "search=EH711"]:
    sep = "?" if "?" not in q else "&"
    u = f"https://hager.com/my/search{sep}{q}" if not q.startswith(("q=","search=")) else f"https://hager.com/my/search?{q}"
    st, h5, fu5 = raw(u)
    n = len(re.findall(r"EH711", h5.upper()))
    tt = re.search(r"<title[^>]*>(.*?)</title>", h5, re.S)
    print("HAGER", st, u[:70], "| EH711 hits:", n, "| title:", (tt.group(1)[:60] if tt else "-"))
