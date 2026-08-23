import sys, socket, json, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def get(url):
    req = urllib.request.Request(url, headers=F.UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.read(600000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:150]

def cdx(domain, filt):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=200&collapse=urlkey&filter={filt}"
    s, t = get(u)
    print("CDX", domain, filt, s)
    if s == 200 and t.strip():
        print(t[:2500])
    else:
        print("EMPTY" if t.strip() == "" else t[:300])

print("=== Cabana CB781 ===")
cdx("cabana.com.my", "original:.*781.*")

print("=== Mitsubishi SC-N2S ===")
cdx("mitsubishielectric.com", "original:.*sc.n2s.*")

print("=== Tajima LB39H ===")
cdx("tajima-tool.com", "original:.*lb39h.*")

print("=== Cabana live search CB781 ===")
for u in ["https://www.cabana.com.my/component/search/?searchword=CB781&ordering=&searchphrase=all",
          "https://www.cabana.com.my/index.php?option=com_search&searchword=CB781"]:
    s, t = get(u)
    print(u[:90], s, len(t))
    if s == 200:
        open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_cabana_search.html", "w", encoding="utf-8").write(t)
        break
