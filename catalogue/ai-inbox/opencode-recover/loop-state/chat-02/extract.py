import re, sys, json
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import probe

url = sys.argv[1]
mode = sys.argv[2] if len(sys.argv) > 2 else "links"
raw = probe.get(url, timeout=int(sys.argv[3]) if len(sys.argv) > 3 else 20)
print("RAW_LEN", len(raw))
if mode == "assets":
    hits = sorted(set(re.findall(r'(?:href|src|data-src)="([^"]+(?:\.pdf|\.jpg|\.jpeg|\.png|\.webp)[^"]*)"', raw, re.I)))
    for h in hits:
        print("ASSET", h[:160])
elif mode == "og":
    for m in re.findall(r'<meta[^>]+(?:property|name)="(og:image[^"]*)"[^>]+content="([^"]+)"', raw):
        print("OG", m[0], m[1])
    for m in re.findall(r'<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="(og:image[^"]*)"', raw):
        print("OG", m[1], m[0])
else:
    for m in sorted(set(re.findall(r'href="([^"]+)"', raw))):
        print(m)
