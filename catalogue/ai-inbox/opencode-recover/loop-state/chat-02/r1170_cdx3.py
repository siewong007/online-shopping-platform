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

def cdx(domain, filt="", extra=""):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=120&collapse=urlkey{extra}"
    if filt:
        u += "&filter=" + filt
    s, t = get(u)
    print("CDX", domain, filt or "-", s)
    if s == 200 and t.strip():
        print(t[:2200])
    else:
        print("EMPTY/ERR" if s == 200 else t[:200])

print("=== Mitsubishi SC-N2S retry ===")
cdx("mitsubishielectric.com", "original:.*sc.n2s.*")

print("=== Tajima lb39 ===")
cdx("tajima-tool.com", "original:.*lb39.*")
cdx("www.tajima-tool.com", "original:.*blade.*", "")

print("=== Premio tap ===")
cdx("premio.com.my", "")
cdx("premioware.com", "")
