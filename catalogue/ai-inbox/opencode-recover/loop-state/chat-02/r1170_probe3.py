import sys, socket, urllib.request, urllib.parse
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def get(url):
    req = urllib.request.Request(url, headers=F.UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.read(800000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:150]

print("=== electgo store API ===")
for u in ["https://electgo.com/wp-json/wc/store/products?search=SC-N2S",
          "https://electgo.com/?s=SC-N2S"]:
    s, t = get(u)
    print(u[:80], s, len(t))
    if s == 200:
        print(t[:600])
        print("---")

def bingrss(q):
    u = "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&format=rss"
    s, t = get(u)
    print("BINGRSS", q[:50], s, len(t))
    if s == 200:
        print(t[:1200])
        print("---")

bingrss('"SC-N2S" contactor')
bingrss('Tajima "LB39H" blade')

print("=== Tajima US/global domains ===")
for d in ["www.tajima-tools.com", "tajima-tool.co.jp"]:
    u = f"http://web.archive.org/cdx/search/cdx?url={d}&matchType=domain&output=json&limit=60&collapse=urlkey&filter=original:.*lb39.*"
    s, t = get(u)
    print("CDX", d, "lb39:", s, t[:400] if s == 200 else t[:100])

print("=== Ecogreen live ===")
s, t = get("https://www.ecogreen.com.my/")
print("home", s, len(t))
if s == 200:
    open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_ecogreen.html", "w", encoding="utf-8").write(t)
    import re
    print([l for l in re.findall(r'href="([^"]+)"', t) if any(k in l.lower() for k in ["product", "shop", "catalog", "adaptor", "hose"])][:25])
