import sys, socket, re
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

# Hager sitemap discovery for true PDP path pattern
for u in ["https://hager.com/robots.txt",
          "https://hager.com/sitemap.xml",
          "https://hager.com/my/sitemap.xml"]:
    try:
        r = F._open(u)
        txt = r.read(400000).decode("utf-8", "ignore")
        print("== ", r.status, u, "| len", len(txt))
        if "sitemap" in u:
            locs = re.findall(r"<loc>([^<]+)</loc>", txt)[:10]
            for l in locs: print("   ", l[:120])
        else:
            print(txt[:400])
    except Exception as e:
        print("fail", repr(e)[:70], u)
