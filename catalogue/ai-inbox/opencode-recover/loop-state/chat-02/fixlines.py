p = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02\write_shard_870.py"
lines = open(p, encoding="utf-8").read().split("\n")
out = []
n = 0
for ln in lines:
    s = ln.strip()
    if s.endswith('exhausted","",') and s.startswith('""'):
        out.append("    " + '"",' * 9 + '"exhausted",""",')
        n += 1
    else:
        out.append(ln)
open(p, "w", encoding="utf-8").write("\n".join(out))
print("fixed lines:", n)
