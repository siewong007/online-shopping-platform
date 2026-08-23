import sys
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp")
from fetch import get, text_of
import re

# search techplas site for float valve / FAI / BW-1007
for path in ["/?s=FAI-1007", "/?s=float", "/?s=BW-1007"]:
    st, body = get("103.27.73.60", "techplas.com.my", path)
    print("===", path, st, len(body))
    links = set(re.findall(rb'href="([^"]+)"', body))
    for l in sorted(links):
        ll = l.decode(errors="replace").lower()
        if any(k in ll for k in ["product", "fai", "bw-", "valve"]):
            print("  ", l.decode(errors="replace"))
