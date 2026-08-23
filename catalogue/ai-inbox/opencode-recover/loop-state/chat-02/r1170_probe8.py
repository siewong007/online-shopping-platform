import re, sys, socket, urllib.request
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

print("=== 1196 Sorento/Cabana kitchen sink category ===")
for host in ["https://www.sorento.com.my", "https://www.cabana.com.my"]:
    u = f"{host}/index.php/products/kitchen/kitchen-sink"
    r = F.fetch_page("1196sink_" + host.split("//")[1][:7], u)
    print(host, r.get("page_status"), r.get("text_len"))
    p = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1196sink_%s.txt" % host.split("//")[1][:7]
    try:
        t = open(p, encoding="utf-8", errors="ignore").read()
        print("CA215 in listing:", "CA215" in t.upper(), "| CA-215:", re.findall(r".{40}CA.{0,2}215.{20}", t)[:3])
        links = re.findall(r'href="([^"]*detail[^"]*)"', open(p.replace(pagecache_dir := "", "") if False else p, encoding="utf-8", errors="ignore").read()) if False else None
    except Exception as e:
        print("cache read err", repr(e)[:80])

print("=== 1176 Nippon Steel Wired Paint Brush ===")
r = F.fetch_page("1176", "https://www.nipponpaint.com.my/product/steel-wired-paint-brush/")
print("live page:", r)
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\1176.txt", encoding="utf-8", errors="ignore").read()
nt = F.norm_text(t)
print("N10 present:", "N10" in nt, "| TR880:", "TR880" in nt, "| STEELWIRED:", "STEELWIRED" in nt)
print(t[:700].replace("\n", " "))
req = urllib.request.Request("https://www.nipponpaint.com.my/product/steel-wired-paint-brush/", headers=F.UA)
try:
    raw = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", errors="ignore")
    imgs = re.findall(r'(?:property="og:image"|data-src|src)="([^"]+(?:uploads|product)[^"]+\.(?:jpg|jpeg|png|webp))"', raw, re.I)
    print("imgs:", list(dict.fromkeys(imgs))[:10])
except Exception as e:
    print("raw err", repr(e)[:120])
