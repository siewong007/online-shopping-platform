import sys, socket, re, os
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

def raw(url):
    try:
        r = F._open(url)
        return r.status, r.read(600000).decode("utf-8", "ignore"), r.geturl()
    except Exception as e:
        return -1, repr(e)[:120], url

# 1) Bosny image tags w/ alt
st, h, fu = raw("https://www.bosny.com/product/bosny-zinc-bright-galvanize-3in1-b136/")
for m in re.finditer(r'<img[^>]+>', h):
    tag = m.group(0)
    if "/uploads/" in tag or "wp-content" in tag:
        src = re.search(r'src="([^"]+)"', tag)
        alt = re.search(r'alt="([^"]*)"', tag)
        cls = re.search(r'class="([^"]*)"', tag)
        print("IMG:", (src.group(1)[-60:] if src else "-"), "| alt:", (alt.group(1)[:50] if alt else ""), "| class:", (cls.group(1)[:40] if cls else ""))
print("400cc mention:", len(re.findall(r"400\s*cc", h, re.I)), "| gallery links:", re.findall(r'href="([^"]*uploads/2023/08[^"]*)"', h)[:8])

# 2) Cabana black shelf PDP -> canonical cache for 2751
p = "https://www.cabana.com.my/index.php/products/bathroom/bathroom-accessories/shelf/cb474-bl-detail"
print("== cabana-bl fetch:", F.fetch_page(2751, p))
print("   precheck L350/CB474-BLK:", safe_precheck(2751, "L350", "SHE-CAB-CB474-BLK"))
t = open(os.path.join(F.PAGECACHE, "2751.txt"), encoding="utf-8", errors="ignore").read()
i = t.upper().find("CB474")
print("   ctx:", t[max(0,i-40):i+220].replace("\n", " "))
st2, h2, fu2 = raw(p)
imgs2 = re.findall(r'/images/virtuemart/product/(?!resized)(CB[\w.-]+\.jpg)', h2)
print("   full imgs:", sorted(set(imgs2)))

# 3) Hager MY EH711 search results
st3, h3, fu3 = raw("https://hager.com/my/search?q=EH711")
links = []
for m in re.finditer(r'href="(/my/[^"]*(?:product|item)[^"]*)"', h3):
    if m.group(1) not in links: links.append(m.group(1))
if not links:
    for m in re.finditer(r'"(/my/[^"]+)"', h3):
        seg = m.group(1)
        if any(k in seg.lower() for k in ["eh711", "time-switch", "timer", "product"]) and seg not in links:
            links.append(seg)
print("HAGER links:", links[:12])

# 4) UNI-T errors detail + CDX
for u in ["https://instruments.uni-trend.com/", "https://www.uni-trend.com/en/products/"]:
    st4, h4, fu4 = raw(u)
    print("UNIT probe:", st4, u[:60], repr(h4)[:90])
