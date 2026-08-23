import sys
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp")
from fetch import get
import re

st, body = get("104.21.6.177", "www.arrowfastener.com.au", "/product/jt21cm-light-duty-staple-gun/")
print("STATUS:", st, "LEN:", len(body))
txt = re.sub(rb"<script.*?</script>|<style.*?</style>", b"", body, flags=re.S | re.I)
t = re.sub(rb"<[^>]+>", b" ", txt)
t = re.sub(rb"\s+", b" ", t)
print(t.decode(errors="replace")[:900])
print("IMG-JT21CM:", b"JT21CM.jpg" in body)
for m in set(re.findall(rb'https?://[^"\']+?JT21[^"\']*?\.(?:jpg|png|webp)', body)):
    print("  IMG:", m.decode(errors="replace"))
