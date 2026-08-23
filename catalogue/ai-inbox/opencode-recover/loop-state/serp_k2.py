#!/usr/bin/env python3
"""K2 researcher: six fixed tier-1 queries per SKU via Bing HTML (bing_fallback),
DDG HTML fallback. Archives chat-01/serp-K2/serps.json keyed by source_position."""
import json, os, random, re, sys, time, urllib.parse, urllib.request
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "chat-01", "serp-K2")
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl_ctx = __import__("ssl")._create_unverified_context()

ALGO_RE = re.compile(r'<li class="b_algo".*?<h2[^>]*><a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)
TAG_RE = re.compile(r"<[^>]+>")
XJUNK = re.compile(r"https?://[a-z.]*(x\.com|x\.company|about\.x|softonic\.com)", re.I)
DDG_RE = re.compile(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', re.S)

def http(u):
    req = urllib.request.Request(u, headers=UA)
    return urllib.request.urlopen(req, timeout=25, context=CTX).read().decode("utf-8", "ignore")

def bing(q):
    u = "https://www.bing.com/search?q=" + urllib.parse.quote_plus(q) + "&count=10&mkt=en-MY"
    try:
        html = http(u)
    except Exception as e:
        return u, "error", [], repr(e)[:100]
    res = []
    for m in ALGO_RE.finditer(html):
        res.append([TAG_RE.sub("", m.group(2)).strip()[:160], urllib.parse.unquote(m.group(1))[:300]])
    if not res:
        if "SafeSearch" in html:
            return u, "safesearch", res, "safesearch-blocked"
        return u, "no_results", res, ""
    junk = sum(1 for _, h in res[:5] if XJUNK.search(h))
    if junk >= 3:
        return u, "rewritten", res, "bing-rewrote-leading-phrase"
    return u, "ok", res, ""

def ddg(q):
    u = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote_plus(q)
    try:
        html = http(u)
    except Exception as e:
        return u, "error", [], repr(e)[:100]
    res = []
    for m in DDG_RE.finditer(html):
        href = m.group(1)
        if "uddg=" in href:
            qq = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
            href = qq.get("uddg", [href])[0]
        elif href.startswith("//"):
            href = "https:" + href
        res.append([TAG_RE.sub("", m.group(2)).strip()[:160], href[:300]])
    return u, ("ok" if res else "no_results"), res[:8], "ddg_fallback"

def unbing(u):
    if "bing.com/ck/a" in u:
        m = re.search(r"[&?]u=a1([^&]+)", u)
        if m:
            s = m.group(1)
            try:
                s = urllib.parse.unquote(s)
                pad = "=" * (-len(s) % 4)
                import base64
                return base64.urlsafe_b64decode(s + pad).decode("utf-8", "ignore")
            except Exception:
                return u
    return u

JUNKDOM = re.compile(r"reddit|quora|pinterest|facebook|tiktok|x\.com|answers\.|wikipedia\.org", re.I)

def run_query(q):
    u, kind, res, note = bing(q)
    chan = "bing_fallback"
    res = [[t, unbing(h)] for t, h in res]
    junk = sum(1 for _, h in res[:5] if JUNKDOM.search(h) or h.startswith("https://www.bing.com"))
    if res and junk >= 3:
        kind, note = "junk", (note + ";bing-junk-social").strip(";")
    if kind in ("no_results", "rewritten", "safesearch", "junk"):
        u2, kind2, res2, note2 = ddg(q)
        note = (note + ";" + note2).strip(";")
        if res2:
            u, kind, res, chan = u2, kind2, res2, "bing+ddg_fallback"
    return {"q": q, "url": u, "kind": kind, "results": res[:8], "note": (chan + "|" + note)}

def queries(brand, model):
    m = model or ""
    b = brand or ""
    return [
        f'"{b}" "{m}" site:.com.my',
        f'"{m}" "{b}" official',
        f'"{m}" filetype:pdf',
        f'"{m}" site:leeden.com.my OR site:theleedenstore.com.my',
        f'"{b}" "{m}" distributor Malaysia',
        f'"{m}" authorised dealer',
    ]

# pos, brand, model  (K2 ordinals 751-839)
SKUS = [
    ("4907", "Eupro", "10829"),
    ("4057", "Ecogreen", "EG4021"),
    ("4136", "", "YG228R"),
    ("5145", "Exori", "4310N"),
    ("5146", "Exori", "4310N"),
    ("5147", "Exori", "4310N"),
    ("6513", "", "B133 wall plug"),
    ("5108", "", "fishing barrel swivel nickel"),
    ("5319", "", "monofilament fishing line No.25"),
    ("3029", "", "RG-2 lighter gas refill"),
    ("3894", "", "skim coat OC-2"),
    ("4574", "", "galvanised bolt nut 1/4 x 3/4"),
    ("6800", "", "drop in anchor 5/16"),
    ("4647", "", "NPH-30 quick coupler"),
    ("6682", "", "grease nipple M10 straight"),
    ("6819", "", "NPF-30 quick coupler female"),
    ("6820", "", "NPM-30 quick coupler male"),
    ("5913", "", "plastic fishing float"),
    ("4814", "", "NPH-20 quick coupler"),
    ("6916", "", "NPF-20 quick coupler female"),
    ("6917", "", "NPM-20 quick coupler male"),
    ("5998", "", "plastic fishing float"),
    ("6108", "", "plastic fishing float"),
    ("3179", "", "round external cap 16mm drip"),
    ("6217", "BR", "6412 cutting disc"),
    ("2860", "", "PVC insulated cable 2.5mm red"),
    ("3048", "", "self drilling screw 12x2"),
    ("2866", "Colex", "RA-501"),
    ("3660", "Lanric", "trunking G24"),
    ("2810", "Eclipse", "hacksaw blade 25mm 10T"),
    ("2979", "", "ratchet tie down 2 inch"),
    ("2953", "Colex", "RB-401"),
    ("3059", "Global", "tape measure 8m"),
    ("4046", "VIP", "angle valve V-4113"),
    ("2654", "SP", "extension socket 2540B"),
    ("3241", "Sensui", "A909 diamond blade"),
    ("4529", "Ecogreen", "EG4440"),
    ("2839", "Activ", "garden sprayer 0063"),
    ("4711", "", "gas blow gun SM920"),
    ("2861", "VIP", "PP-48 flexible tube"),
    ("3581", "Liao", "Z130006 mop broom holder"),
    ("2716", "Jayamata", "JM-1002 pruning shear"),
    ("2805", "", "hollow punch set 55600"),
    ("4780", "Ultra", "M031MG switch"),
    ("3691", "Korakoh", "M9000 rain shoes"),
    ("3692", "Korakoh", "M9000 rain shoes"),
    ("2665", "National", "T16W light capsule"),
    ("2848", "", "long nose pliers 150mm"),
    ("3579", "", "parang atap AK350"),
    ("2806", "", "combination pliers 150mm"),
    ("3687", "", "hex bull point 17x280"),
    ("2302", "", "black hose 9mm x 2mm"),
    ("3792", "Sandex", "velcro backing pad M10"),
    ("2870", "", "water level 3801x12"),
    ("4948", "Ultra", "M073W telephone outlet"),
    ("3833", "", "carbon brush DC-MCB303"),
    ("3100", "", "flexible hose mixer XM10"),
    ("4032", "Liao", "A130101 mop refill"),
    ("4098", "", "open end wrench 14x17"),
    ("3285", "VIP", "PP-16 flexible tube"),
    ("2892", "Takado", "CHTR-30011 measuring tape"),
    ("3097", "", "garden hoe wood handle 106B"),
    ("3995", "", "broom SBSJ001"),
    ("4209", "Eagle Wave", "DX-400 hook"),
    ("4222", "Aerico", "6ME4"),
    ("5076", "Ace", "flat head nails 20x2.0"),
    ("3184", "Ecogreen", "EG4134"),
    ("5231", "", "YG228R"),
    ("4352", "", "open end wrench 11x13"),
    ("4111", "", "grinding wheel W2451"),
    ("5653", "", "cable lug 400A"),
    ("5546", "T&T", "2 way auger bit"),
    ("4561", "Sunlon", "m tape 3.6m"),
    ("5339", "", "uPVC bend 82mm 45 degree"),
    ("5428", "", "YG237 brass socket"),
    ("4425", "Eupro", "1920 hook"),
    ("4509", "", "4206 galah hook"),
    ("5732", "", "MB15AK gas nozzle"),
    ("2133", "Paint Master", "spray paint No.6"),
    ("3674", "", "NSH-30 quick coupler hose"),
    ("4641", "Surecatch", "SC4061"),
    ("5982", "", "NSM-20 quick coupler male"),
    ("5697", "", "YG239R brass socket"),
    ("5983", "", "mini ball valve 1/4 brass"),
    ("3514", "", "vinyl front lever TPE6203"),
    ("3650", "", "water sprayer 500cc"),
    ("5922", "MDSI", "MD-02063 screw bit"),
]

CACHE_FILE = os.path.join(BASE, "chat-01", "serp-K2", "qcache.json")
cache = {}
if os.path.exists(CACHE_FILE):
    cache = json.load(open(CACHE_FILE, encoding="utf-8"))
out_path = os.path.join(OUT, "serps.json")
all_data = {}
if os.path.exists(out_path):
    all_data = json.load(open(out_path, encoding="utf-8"))

only = set(sys.argv[1:]) if len(sys.argv) > 1 else None
os.makedirs(OUT, exist_ok=True)
for pos, brand, model in SKUS:
    if only and pos not in only:
        continue
    rows = []
    for q in queries(brand, model):
        if q in cache and time.time() - cache[q].get("ts", 0) < 86400 * 3:
            rows.append(cache[q]["res"])
            continue
        r = run_query(q)
        r["ts"] = time.time()
        cache[q] = {"ts": r.pop("ts"), "res": r}
        rows.append(r)
        time.sleep(random.uniform(0.12, 0.3))
    all_data[pos] = {"brand": brand, "model": model, "rows": rows}
    json.dump(all_data, open(out_path, "w", encoding="utf-8"))
    json.dump(cache, open(CACHE_FILE, "w", encoding="utf-8"))
    summ = "; ".join(f"{r['kind']}:{len(r['results'])}" for r in rows)
    print(pos, brand, model, "->", summ, flush=True)
print("saved", out_path)

