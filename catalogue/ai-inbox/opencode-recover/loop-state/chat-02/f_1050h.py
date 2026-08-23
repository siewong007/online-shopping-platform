import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

st_raw = F._open("https://hager.com/my/search?q=EH711").read(800000).decode("utf-8", "ignore")
m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', st_raw, re.S)
d = json.loads(m.group(1))

def walk(o, path=""):
    if isinstance(o, dict):
        # hit heuristic
        keys = set(o.keys())
        if {"objectID"} & keys or ("name" in keys and ("url" in keys or "uris" in keys or "image_url" in keys)):
            yield path, o
        for k2, v2 in o.items():
            yield from walk(v2, path + "/" + str(k2))
    elif isinstance(o, list):
        for i2, v2 in enumerate(o):
            yield from walk(v2, f"{path}[{i2}]")

found = []
for p, h in walk(d):
    blob = json.dumps(h, ensure_ascii=False)
    if "EH711" in blob.upper() or "eh711" in blob.lower():
        found.append((p, h))
print("candidate hits:", len(found))
seen = set()
for p, h in found[:12]:
    oid = str(h.get("objectID", ""))
    if oid in seen: continue
    seen.add(oid)
    print("PATH:", p[-90:])
    print("   ", {k: h[k] for k in list(h)[:14] if not isinstance(h[k], (dict, list))})
