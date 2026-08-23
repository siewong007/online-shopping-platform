import sys
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp")
from fetch import get

st, body = get("103.27.73.60", "techplas.com.my", "/products/parts-of-flushing-cistern/side-inlet-valve/fai-1007/")
print(st)
for m in set(__import__("re").findall(rb'https?://[^"\']+?\.(?:jpg|jpeg|png|webp)', body)):
    print(m.decode(errors="replace"))
