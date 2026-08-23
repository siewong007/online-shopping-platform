import json, re, sys, time, urllib.request, urllib.parse, os, base64
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "serp-I2")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}

def bing(q):
    url = "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&count=15&mkt=en-MY"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode("utf-8", "ignore")

def dec(u):
    if "bing.com/ck/a" in u:
        m = re.search(r"[?&]u=a1([A-Za-z0-9_-]+)", u)
        if m:
            s = m.group(1)
            s += "=" * (-len(s) % 4)
            try:
                return base64.urlsafe_b64decode(s).decode("utf-8", "ignore")
            except Exception:
                return u
    return u

def digest(html):
    items = re.findall(r'<li class="b_algo".*?</li>', html, re.S)
    out = []
    for it in items[:10]:
        m = re.search(r'<h2[^>]*><a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', it, re.S)
        if not m: continue
        u = dec(m.group(1))
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        snip = re.sub(r"<[^>]+>", " ", it)
        snip = re.sub(r"https?://\S+", "", snip)
        snip = re.sub(r"\s+", " ", snip).strip()[:180]
        out.append("%s | %s | %s" % (title[:90], u, snip))
    return "\n".join(out)

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "fetch":
        qlist = json.load(open(sys.argv[2], encoding="utf-8"))
        delay = float(sys.argv[3]) if len(sys.argv) > 3 else 3.0
        for job in qlist:
            jid, q = job["id"], job["q"]
            fp = os.path.join(OUT, jid + ".html")
            dp = os.path.join(OUT, jid + ".txt")
            if os.path.exists(dp):
                print("skip", jid, flush=True); continue
            try:
                html = bing(q)
                open(fp, "w", encoding="utf-8").write(html)
                open(dp, "w", encoding="utf-8").write(digest(html))
                print("ok", jid, len(re.findall(r'b_algo', html)), flush=True)
            except Exception as e:
                print("ERR", jid, repr(e)[:100], flush=True)
            time.sleep(delay)
    elif mode == "digest":
        # re-digest all cached html files
        import glob
        for fp in glob.glob(os.path.join(OUT, "*.html")):
            dp = fp[:-5] + ".txt"
            html = open(fp, encoding="utf-8", errors="ignore").read()
            open(dp, "w", encoding="utf-8").write(digest(html))
        print("redigested", len(glob.glob(os.path.join(OUT, '*.html'))), flush=True)
