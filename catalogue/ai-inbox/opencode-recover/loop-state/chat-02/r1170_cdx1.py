import sys, socket, json, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

UA = F.UA

def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.read(400000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:150]

def cdx(pattern, extra=""):
    u = f"http://web.archive.org/cdx/search/cdx?url={pattern}&output=json&limit=100&collapse=urlkey{extra}"
    s, t = get(u)
    print("CDX", pattern, s, t[:1200] if s == 200 else t)

print("=== Cabana CB781 ===")
cdx("www.cabana.com.my", "&filter=original:.*781.*")

print("=== Mitsubishi SC-N2S ===")
cdx("mitsubishielectric.com", "&filter=original:.*sc-n2.*")
cdx("www.mitsubishiefa.com", "")

print("=== Tajima LB39H ===")
cdx("tajima-tool.com", "&filter=original:.*lb39.*")
cdx("tajimatool.com", "")
