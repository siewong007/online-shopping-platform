import sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def get(url, save=None):
    req = urllib.request.Request(url, headers=F.UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        t = r.read(800000).decode("utf-8", errors="ignore")
        if save:
            open(save, "w", encoding="utf-8").write(t)
        return r.status, t
    except Exception as e:
        return -1, repr(e)[:150]

def cdx(domain, filt="", match="domain"):
    u = f"http://web.archive.org/cdx/search/cdx?url={domain}&matchType={match}&output=json&limit=80&collapse=urlkey"
    if filt:
        u += "&filter=" + filt
    s, t = get(u)
    print("CDX", domain, filt or "-", s, (t[:900] if s == 200 and t.strip() else ("EMPTY" if s == 200 else t[:120])))

print("=== 1198 SC-N2S: Electgo (authorised ME FA estore) ===")
for u in ["https://electgo.com/?s=SC-N2S&post_type=product",
          "https://electgo.com/catalogsearch/result/?q=SC-N2S"]:
    s, t = get(u, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_electgo.html")
    print(u[:70], s, len(t))
    if s == 200 and len(t) > 3000:
        break

print("=== 1198 CDX mitsubishielectric.com/fa/products prefix n2s ===")
cdx("www.mitsubishielectric.com/fa/products", "original:.*n2s.*", "prefix")

print("=== 1191 Tajima live ===")
s, t = get("https://www.tajima-tool.com/sitemap.xml")
print("sitemap", s, len(t), t[:400])
if s == 200 and "<loc>" in t:
    import re
    locs = re.findall(r"<loc>([^<]+)</loc>", t)
    hits = [l for l in locs if "lb39" in l.lower() or "blade" in l.lower()]
    print("hits:", hits[:20], "| total locs:", len(locs))

print("=== 1172 Sawman ===")
cdx("sawman.com.tw", "")
cdx("sawman.com.my", "")

print("=== 1174/1182 Ecogreen ===")
cdx("ecogreen.com.my", "")
cdx("ecogreen2u.com", "")

print("=== 1199 Premio tap domains ===")
cdx("premiobathware.com", "")
cdx("premio.my", "")
