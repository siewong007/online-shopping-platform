import sys, os, json
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F, rh

# restore 5343 image evidence (last write wins in gate merge)
ev = F.fetch_image("5343", "https://cdn1.npcdn.net/image/1559617303032d525f8842aae59a0bd22e9ff6f836.png?md5id=ec97b3455d25310a00e49c9abf0633a1&new_width=1200&new_height=1200&size=max&w=1567133447")
print("5343 refetch:", {k: ev.get(k) for k in ("image_status", "px_w", "px_h", "image_bytes_len", "image_sha256")})

data = json.load(open(F.EVIDENCE_PATH, encoding="utf-8"))
for pos in ("5342", "5343"):
    d = data.get(pos, {})
    print(pos, {k: d.get(k) for k in ("page_status", "page_final_url", "image_status", "image_final_url", "image_content_type", "image_bytes_len", "image_sha256", "px_w", "px_h")})
print("precheck 5342:", rh.precheck("5342", "HE4251"))
print("precheck 5343:", rh.precheck("5343", "HE4252"))
