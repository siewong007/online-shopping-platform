import sys, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
import re

for pos, url in [
    (980, "https://www.mkelectric.com/en/search?text=G2977"),
    (980, "https://www.mkelectric.com/en-gb/search?text=G2977"),
]:
    r = F.fetch_page(pos, url)
    print(url, "->", r.get("page_status"), r.get("text_len"))
    try:
        t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\pagecache\980.txt", encoding="utf-8", errors="ignore").read()
        print("G2977 in text:", "G2977" in re.sub(r"[^0-9A-Za-z]+", "", t).upper())
    except Exception as e:
        print("read fail", e)
