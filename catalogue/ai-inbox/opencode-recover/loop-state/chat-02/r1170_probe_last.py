import sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def cdx(domain):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=25&collapse=urlkey"
    req = urllib.request.Request(u, headers=F.UA)
    try:
        t = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
        print("CDX", domain, "->", (t[:500] if t.strip() else "EMPTY"))
    except Exception as e:
        print("CDX", domain, "ERR", repr(e)[:90])

cdx("hytac.com")
cdx("zhengtu.cn")
cdx("scin.com.my")
