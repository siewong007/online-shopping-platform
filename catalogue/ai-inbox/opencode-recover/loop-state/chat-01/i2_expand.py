import urllib.request, re, sys, ssl, os
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = os.path.dirname(os.path.abspath(__file__))
SM = os.path.join(BASE, "serp-I2", "sitemaps")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE

def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25, context=ctx) as r:
        return r.read().decode("utf-8", "ignore")

# expand leeden + dewalt + eupro + colex indexes
for idx in ["leeden", "dewalt", "eupro", "colex"]:
    fp = os.path.join(SM, idx + ".xml")
    if not os.path.exists(fp): continue
    t = open(fp, encoding="utf-8", errors="ignore").read()
    locs = re.findall(r"<loc>([^<]+)</loc>", t)
    print("==", idx, "index:", locs[:20], flush=True)
    allurls = []
    for i, loc in enumerate(locs[:40]):
        try:
            t2 = get(loc)
            us = re.findall(r"<loc>([^<]+)</loc>", t2)
            allurls.extend(us)
            if len(allurls) > 200000: break
        except Exception as e:
            print("   err", loc[:80], repr(e)[:60], flush=True)
    outp = os.path.join(SM, idx + "-all.txt")
    open(outp, "w", encoding="utf-8").write("\n".join(dict.fromkeys(allurls)))
    print("   total urls:", len(set(allurls)), flush=True)

# grep for our models
MODELS = {
    "leeden-all": ["996060809","9960651630","dw4785","sse-919","sse919","cr1632","elegance","e20ab"],
    "dewalt-all": ["dw4785","4785"],
}
for f, pats in MODELS.items():
    fp = os.path.join(SM, f + ".txt")
    if not os.path.exists(fp): continue
    lines = open(fp, encoding="utf-8").read().splitlines()
    print("== grep", f, len(lines), "urls")
    for p in pats:
        hits = [l for l in lines if re.search(p, l, re.I)]
        print("  ", p, "->", hits[:5] if hits else "none")
