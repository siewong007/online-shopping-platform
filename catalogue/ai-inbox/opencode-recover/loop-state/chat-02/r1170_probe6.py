import re, sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def get(url):
    req = urllib.request.Request(url, headers=F.UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        return r.status, r.read(900000).decode("utf-8", errors="ignore"), r.geturl()
    except Exception as e:
        return -1, repr(e)[:150], url

t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_cabana_search.html", encoding="utf-8", errors="ignore").read()
forms = re.findall(r"<form[^>]*>", t)
print("cabana forms:", forms[:5])

print("=== Electgo sitemaps ===")
for u in ["https://electgo.com/sitemap_index.xml", "https://electgo.com/wp-sitemap.xml", "https://electgo.com/sitemap.xml"]:
    s, t, _ = get(u)
    print(u, s, len(t))
    if s == 200 and "<loc>" in t:
        locs = re.findall(r"<loc>([^<]+)</loc>", t)
        print(locs[:12])
        break

print("=== Electgo slug guesses ===")
for slug in ["scn2s", "me-scn2s", "mitsubishi-scn2s"]:
    s, t, fu = get(f"https://electgo.com/product/{slug}")
    print(slug, s, len(t), ("N2S" in t.upper()))

print("=== Mitsubishi FA LV contactors live ===")
s, t, _ = get("https://www.mitsubishielectric.com/fa/products/lv/")
print("lv page", s, len(t))
if s == 200:
    hits = re.findall(r'href="([^"]*)"[^>]*>([^<]{0,80})', t)
    ct = [h for h in hits if any(k in h[1].lower() + h[0].lower() for k in ["contactor", "sc-", "relay"])]
    print("contactor-ish:", ct[:15])
