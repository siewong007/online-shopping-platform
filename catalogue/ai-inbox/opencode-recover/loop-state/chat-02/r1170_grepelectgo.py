import re
t = open(r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\r1170_electgo.html", encoding="utf-8", errors="ignore").read()
print("len", len(t))
hits = [m.start() for m in re.finditer(r"(?i)sc[\s\-]?n2s", t)]
print("SC-N2S mentions:", len(hits))
for i in hits[:6]:
    print("CTX:", t[max(0, i - 260):i + 160].replace("\n", " ")[:420])
    print("---")
# product links near mentions
links = set(re.findall(r'href="(https://electgo\.com/product/[^"]+)"', t))
print("product links sample:", list(links)[:10])
