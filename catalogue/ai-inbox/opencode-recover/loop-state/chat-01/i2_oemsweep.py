import urllib.request, urllib.parse, re, sys, ssl, time, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
SM = os.path.join(BASE, "serp-I2", "sitemaps")
os.makedirs(SM, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

TARGETS = {
    "stanley-tools":   ["https://www.stanleytools.com/sitemap.xml"],
    "leeden":          ["https://www.leeden.com.my/sitemap.xml", "https://www.theleedenstore.com.my/sitemap.xml"],
    "dewalt":          ["https://www.dewalt.com/sitemap.xml"],
    "mrmark":          ["https://www.mrmark.com.my/sitemap.xml", "https://mrmark.asia/sitemap.xml"],
    "hardex":          ["https://www.hardex.com.my/sitemap.xml", "https://hardex.com.my/sitemap.xml"],
    "paintmaster":     ["https://www.paintmaster.com.my/sitemap.xml", "https://paintmaster.com.my/sitemap.xml", "https://www.paintmaster.com.my/wp-sitemap.xml"],
    "retouch":         ["https://www.retouch.my/category/sitemap.xml", "https://www.retouch.my/showcase/sitemap.xml"],
    "colex":           ["https://www.colex.com.sg/sitemap.xml", "https://colex.com.my/sitemap.xml"],
    "glocks":          ["https://www.glocks.com.my/sitemap.xml", "https://glocks.com.my/sitemap.xml"],
    "surecatch":       ["https://www.surecatch.net/sitemap.xml", "https://surecatch.com.sg/sitemap.xml"],
    "exori":           ["https://www.exori.com.my/sitemap.xml", "https://exori.com.my/sitemap.xml"],
    "hytac":           ["https://www.hytac.com.my/sitemap.xml", "https://hytac.com.my/sitemap.xml"],
    "eupro":           ["https://www.eupro.com.my/sitemap.xml", "https://eupro.com.my/sitemap.xml", "https://www.eupro.com/sitemap.xml"],
    "mlcable":         ["https://www.mlcable.com.my/sitemap.xml", "https://mlcable.com.my/sitemap.xml"],
    "ecogreen":        ["https://www.ecogreen.com.my/sitemap.xml", "https://ecogreen.com.my/sitemap.xml"],
    "leonhardware":    ["https://www.leonhardware.com.my/sitemap.xml", "https://leonhardware.com.my/sitemap.xml"],
    "pye":             ["https://www.pye.com.my/sitemap.xml", "https://pye.com.my/sitemap.xml"],
    "toyogrease":      ["https://www.toyogrease.com/sitemap.xml", "https://toyogrease.com.my/sitemap.xml"],
    "panasonic-my":    ["https://www.panasonic.com/my/sitemap.xml"],
}

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
        ct = r.headers.get("Content-Type", "")
        return r.read(), ct

for name, urls in TARGETS.items():
    ok = False
    for u in urls:
        try:
            data, ct = get(u)
            fp = os.path.join(SM, name.replace("/", "_") + ".xml")
            open(fp, "wb").write(data[:3_000_000])
            n_loc = len(re.findall(rb"<loc>", data))
            print("OK", name, u, len(data), "locs:", n_loc, flush=True)
            ok = True
            break
        except Exception as e:
            print("--", name, u, repr(e)[:80], flush=True)
    if not ok:
        print("FAIL", name, flush=True)
