import sys, socket, re, os, json
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

st_raw = F._open("https://hager.com/my/search?q=EH711").read(800000).decode("utf-8", "ignore")
m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', st_raw, re.S)
d = json.loads(m.group(1))
ss = d["props"]["pageProps"]["serverState"]["initialResults"]
hits = []
for k, v in ss.items():
    res = v.get("results")
    if isinstance(res, list):
        for r in res:
            for h in (r.get("hits") or []):
                if isinstance(h, dict) and "EH711" in json.dumps(h)[:2000]:
                    hits.append((k, h))
seen = set()
for k, h in hits:
    oid = h.get("objectID") or h.get("id")
    if oid in seen: continue
    seen.add(oid)
    print("IDX:", k)
    print("   keys:", sorted(h.keys())[:24])
    print("   name:", h.get("name") or h.get("title"))
    print("   id/sku:", oid, "| ref:", h.get("reference") or h.get("sku"))
    print("   url:", h.get("url") or h.get("uris") or h.get("seoUrl"))
    print("   img:", h.get("image") or h.get("imageUrl") or h.get("picture"))
