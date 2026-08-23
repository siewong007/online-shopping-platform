import sys, socket, re
socket.setdefaulttimeout(20)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def probe(url):
    try:
        r = F._open(url)
        raw = r.read(200000).decode("utf-8", "ignore")
        t = re.search(r"<title[^>]*>(.*?)</title>", raw, re.S | re.I)
        print("OK ", r.status, url[:70], "| title:", (re.sub(r"\s+", " ", t.group(1))[:70] if t else "-"))
        return raw
    except Exception as e:
        print("ERR", repr(e)[:60], url[:70])
        return ""

for d in ["http://www.growelec.co.kr/", "http://growelec.co.kr/", "https://www.mclcasters.com/",
          "http://www.exori.com.my/", "http://glolift.com.my/", "https://www.vtech.com.my/",
          "https://www.techscrew.com.my/", "https://www.spearandjackson.com/",
          "https://mrmarktools.com/", "https://www.mrmark.asia/", "https://morries.asia/",
          "https://www.leon.com.my/", "https://www.alteatools.com/"]:
    probe(d)
