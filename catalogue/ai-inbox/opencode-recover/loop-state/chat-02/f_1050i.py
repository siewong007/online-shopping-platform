import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def raw(url):
    try:
        r = F._open(url)
        return r.status, r.read(600000).decode("utf-8", "ignore"), r.geturl()
    except Exception as e:
        return -1, repr(e)[:90], url

# 1) Hager exact EH711 elsewhere (store-view algolia embedded)
for cc in ["uk", "au", "de"]:
    st, h, fu = raw(f"https://hager.com/{cc}/search?q=EH711")
    if st == 200:
        exact = len(re.findall(r'"commercialRef":\s*"EH711"', h))
        namehits = re.findall(r'"name":\s*"(EH711[^"]*)"', h)
        print("HAGER", cc, "| commercialRef EH711:", exact, "| names:", namehits[:3])
    else:
        print("HAGER", cc, "->", st)

# 2) UNI-T instruments DMM listing: grep UT33 in raw html/json
st, h, fu = raw("https://instruments.uni-trend.com/products/digital-multimeters/")
print("UNIT DMM raw:", st, "| UT33 count:", h.count("UT33"))
for m in list(re.finditer(r"UT33[\w+-]*", h))[:10]:
    seg = h[max(0,m.start()-140):m.start()+120].replace("\n"," ")
    print("   ...", seg[:240])
