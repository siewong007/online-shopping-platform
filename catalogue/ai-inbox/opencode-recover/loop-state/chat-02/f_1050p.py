import sys, socket, json, re, time
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F
from f_1050b import safe_precheck

UA = F.UA

# 1) captures of bahco png
u = "http://web.archive.org/cdx/search/cdx?url=bahco.com/uploads/np-19-u7_8-hp.png&output=json"
try:
    d = json.loads(F._open(u).read().decode("utf-8", "ignore"))
    caps = d[1:]
    print("captures:", caps)
except Exception as e:
    print("cdx fail", repr(e)[:80]); caps = []

# 2) imgs inside archived pl_pl PDP
raw = F._open("http://web.archive.org/web/20210304062854/https://www.bahco.com/pl_pl/uniwersalna-pila-reczna-np-19-u7-8-hp.html").read(800000).decode("utf-8", "ignore")
imgs = re.findall(r'(?:src|href|data-src)="([^"]*(?:np-19|u7)[^"]*\.(?:png|jpe?g|webp))"', raw, re.I)
print("pdp imgs:", list(dict.fromkeys(imgs))[:10])

# 3) try fetching png from captures (id_ original), retries for 503
cands = ["http://web.archive.org/web/20181108052609id_/https://www.bahco.com/uploads/np-19-u7_8-hp.png"]
for ts in [c[1] for c in caps][:2]:
    cands.append(f"http://web.archive.org/web/{ts}id_/http://www.bahco.com/uploads/np-19-u7_8-hp.png")
ok = False
for cu in dict.fromkeys(cands):
    for attempt in range(2):
        ev = F.fetch_image(3070, cu)
        print("try:", cu[-60:], "->", {k: ev.get(k) for k in ["image_status","px_w","px_h","image_bytes_len"]})
        if ev.get("image_bytes_len", 0) >= 20000 and ev.get("px_w", 0) >= 500:
            ok = True; break
        time.sleep(3)
    if ok: break
print("BAHCO IMG OK:", ok)
