import urllib.request, re, sys, ssl, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
OUTP = os.path.join(BASE, "serp-I2")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url, t=18):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=t, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

def probe(name, url, pats):
    try:
        h = get(url)
        fp = os.path.join(OUTP, f"oem-{name}.html")
        open(fp, "w", encoding="utf-8").write(h)
        low = h.lower()
        found = []
        for p in pats:
            if p.lower() in low:
                i = low.find(p.lower())
                snip = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "|", h[max(0,i-100):i+200]))[:200]
                found.append((p, snip))
        print("OK", name, len(h), "hits:", [f[0] for f in found])
        for p, s in found[:4]:
            print("   ", p, "::", s)
    except Exception as e:
        print("--", name, repr(e)[:70])

probe("paintmaster-home", "https://www.paintmaster.com.my/", ["aerosol", "spray", "no.30", "142"])
probe("ecogreen-home", "https://www.ecogreen.com.my/", ["eg2012", "twist nozzle", "nozzle"])
probe("toyogrease-home", "https://www.toyogrease.com/", ["eaj", "bentonite", "mp2"])
probe("colex-posts", "https://www.colex.com.sg/wp-sitemap-posts-post-1.xml", ["ta-", "za-", "zk-", "padlock"])
probe("eupro-home", "https://eupro.com/", ["1920", "hook"])
probe("surecatch-home", "https://www.surecatch.net/", ["biru", "406", "hook"])
probe("stanley-tools-retry", "https://www.stanleytools.com/sitemap.xml", [])
probe("kancil", "https://kancil.com.my/sitemap.xml", ["casing"])
probe("techscrew", "https://techscrew.com.my/sitemap.xml", [])
probe("lionking", "https://lionking.com.my/sitemap.xml", ["ds516how", "screw"])
probe("anchorpaint", "https://anchorpaint.com.my/sitemap.xml", ["c018", "chrome"])
probe("gardenu", "https://gardenu.com.my/sitemap.xml", ["026b"])
probe("otosani", "https://otosani.com/sitemap.xml", ["966"])
probe("mclcasters", "https://www.mclcasters.com/sitemap.xml", ["dl5"])
probe("goldelephant", "https://goldelephant.com.my/sitemap.xml", ["4120"])
probe("dekko", "https://dekko.com.my/sitemap.xml", ["042b"])
probe("panasonic-cr1632", "https://www.panasonic.com/my/consumer/batteries/archive/products/cr1632.html", ["cr1632"])
probe("panasonic-cr1632-b", "https://www.panasonic.com/my/consumer/batteries/lithium/cr1632.html", ["cr1632"])
