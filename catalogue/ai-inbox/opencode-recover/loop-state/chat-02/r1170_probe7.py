import re, sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def get(url, tmo=25):
    req = urllib.request.Request(url, headers=F.UA)
    try:
        r = urllib.request.urlopen(req, timeout=tmo)
        return r.status, r.read(900000).decode("utf-8", errors="ignore")
    except Exception as e:
        return -1, repr(e)[:150]

print("=== 1196 Sorento CA215 ===")
s, t = get("https://www.sorento.com.my/index.php/component/virtuemart/results,1-?search=true&Itemid=0&keyword=CA215")
print("vm search", s, len(t))
if s == 200:
    open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_sorento_search.html", "w", encoding="utf-8").write(t)
    idx = [m.start() for m in re.finditer(r"(?i)ca[\s\-]?215", t)]
    print("CA215 mentions:", len(idx))
    for i in idx[:4]:
        print("CTX:", t[max(0, i - 220):i + 120].replace("\n", " ")[:340])
for guess in ["https://www.sorento.com.my/index.php/products/kitchen/kitchen-sink/ca215-detail",
              "https://www.cabana.com.my/index.php/products/kitchen/kitchen-sink/ca215-detail"]:
    r = F.fetch_page(f"1196{guess[24:30]}", guess)
    print(guess[-40:], r.get("page_status"), r.get("text_len"))

def cdx(domain, filt="", tmo=25):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType=domain&output=json&limit=60&collapse=urlkey"
    if filt:
        u += "&filter=" + filt
    s, t = get(u, tmo)
    print("CDX", domain, filt or "-", s, (t[:800] if s == 200 and t.strip() else ("EMPTY" if s == 200 else t[:110])))

print("=== 1198 Mitsubishi regional CDX ===")
cdx("mitsubishielectric.com.sg", "original:.*sc.n2s.*")
cdx("mitsubishielectric.co.th", "original:.*sc.n2s.*")

print("=== 1172 Sawman ===")
cdx("sawman.com", "")

print("=== 1176 Nippon TR880 ===")
cdx("nipponpaint.com.my", "original:.*(tr880|brush).*")
