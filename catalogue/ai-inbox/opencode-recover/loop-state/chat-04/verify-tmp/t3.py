import sys
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp")
from fetch import get
import re

# Find JT21CM product page on arrowfastener.com.au (Cloudflare)
ips = ["104.21.6.177", "172.67.135.21"]
host = "www.arrowfastener.com.au"
for path in ["/product/jt21cm/", "/?s=JT21CM", "/?post_type=product&s=jt21"]:
    st, body = get(ips[0], host, path)
    print("===", path, st, len(body))
    txt = re.sub(rb"<script.*?</script>|<style.*?</style>", b"", body, flags=re.S | re.I)
    t = re.sub(rb"<[^>]+>", b" ", txt)
    t = re.sub(rb"\s+", b" ", t)
    print(t.decode(errors="replace")[:600])
    links = set(re.findall(rb'href="([^"]*jt21[^"]*)"', body, re.I))
    for l in sorted(links)[:10]:
        print("  L:", l.decode(errors="replace"))
