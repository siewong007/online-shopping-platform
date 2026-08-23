import sys, socket, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36"}

def get(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=18)
        h = r.read(600000).decode("utf-8", errors="ignore")
        m = re.search(r"<title>([^<]{4,140})", h, re.I)
        return r.status, re.sub(r"\s+", " ", m.group(1)).strip()[:110] if m else "?", h
    except urllib.error.HTTPError as e:
        return e.code, "", ""
    except Exception as e:
        return -1, repr(e)[:50], ""

tests = []
for n in range(800, 841):
    tests.append((f"stmt{n}-8", f"cushion-grip-standard-screwdriver-3-x-150mm"))
    tests.append((f"stmt{n}-8", f"cushion-grip-screw-driver-standard-3x150mm"))
    tests.append((f"stmt{n}-8", f"cushion-grip-standard-screwdriver-5-x-150mm"))
    tests.append((f"stmt{n}-8", f"cushion-grip-screw-driver-standard-5x150mm"))
found = {}
for code, slug in tests:
    u = f"https://my.stanleytools.global/product/{code}/{slug}"
    st, t, _ = get(u)
    if st == 200 and t and "?" not in t[:5]:
        print("HIT:", u[:120], "|", t)
        found[code] = u
# also PH0 x150 phillips
for n in range(800, 808):
    for slug in [f"cushion-grip-phillips-screwdriver-ph0-x-150mm",
                 f"cushion-grip-screw-driver-phillips-ph0-x-150mm"]:
        u = f"https://my.stanleytools.global/product/stmt{n}-8/{slug}"
        st, t, _ = get(u)
        if st == 200 and t:
            print("HIT:", u[:120], "|", t)
print("done")
