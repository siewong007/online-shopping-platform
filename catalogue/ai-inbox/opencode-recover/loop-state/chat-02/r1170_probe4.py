import sys, socket, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def norm(s):
    return F.norm_text(s)

print("=== 1191 Tajima LB39H official PDP ===")
r = F.fetch_page("1191", "https://tajima-tools.com/produkt/cutterklingen-9-mm-30-acute-angle-blade-lb39h")
print("page:", r)
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1191.txt", encoding="utf-8", errors="ignore").read()
nt = norm(t)
print("LB39H in page:", "LB39H" in nt, "| TAJIMA:", "TAJIMA" in nt)
print("snippet:", t[:500].replace("\n", " "))
# find og:image
import re
raw_req = urllib.request.Request("https://tajima-tools.com/produkt/cutterklingen-9-mm-30-acute-angle-blade-lb39h", headers=F.UA)
try:
    raw = urllib.request.urlopen(raw_req, timeout=25).read().decode("utf-8", errors="ignore")
    imgs = re.findall(r'property="og:image" content="([^"]+)"', raw) + re.findall(r'src="([^"]+(?:wp-content/uploads)[^"]+\.(?:jpg|jpeg|png|webp))"', raw, re.I)
    print("img candidates:", list(dict.fromkeys(imgs))[:8])
except Exception as e:
    print("raw err", repr(e)[:120])

print("=== DDG html channel test (SC-N2S) ===")
q = '"SC-N2S" magnetic contactor'
u = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(q)
req = urllib.request.Request(u, headers=F.UA)
try:
    t = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
    print("ddg len", len(t))
    links = re.findall(r'result__a[^>]*href="([^"]+)"', t)
    print("links:", links[:10])
except Exception as e:
    print("ddg err", repr(e)[:150])

print("=== Ecogreen .my ===")
def cdx(domain):
    u2 = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=60&collapse=urlkey"
    req = urllib.request.Request(u2, headers=F.UA)
    try:
        t = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
        print("CDX", domain, t[:700])
    except Exception as e:
        print("CDX", domain, "ERR", repr(e)[:100])
cdx("ecogreen.my")
