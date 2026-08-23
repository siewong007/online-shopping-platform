import sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

print("=== 1191 Tajima product image ===")
for u in ["https://tajima-tools.com/wp-content/uploads/2021/06/ph_004.png"]:
    ev = F.fetch_image("1191", u)
    print(u.split("/")[-1], ev.get("image_status"), ev.get("px_w"), ev.get("px_h"), ev.get("image_bytes_len"))

print("=== 1196 CA215: Cabana kitchen sinks / Sorento ===")
def cdx(domain, filt=""):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=120&collapse=urlkey"
    if filt:
        u += "&filter=" + filt
    req = urllib.request.Request(u, headers=F.UA)
    try:
        t = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
        print("CDX", domain, filt or "-", t[:1500])
    except Exception as e:
        print("CDX", domain, "ERR", repr(e)[:100])

cdx("cabana.com.my", "original:.*ca215.*")
cdx("sorento.com.my", "")
cdx("ifixh.com", "")
cdx("glotool.com.my", "")
