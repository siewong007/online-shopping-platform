"""chat-02 helper: fetch raw HTML/PDF, cache normalized text like fetchlib.fetch_page,
and list candidate product-image URLs (og:image / json-ld / <img>)."""
import sys, os, re, html, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetchlib as F

def raw_get(url, timeout=25, max_bytes=6_000_000):
    req = urllib.request.Request(url, headers=F.UA)
    return urllib.request.urlopen(req, timeout=timeout)

def absurl(base, u):
    import urllib.parse
    u = html.unescape(u.strip().replace("\\/", "/"))
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http"):
        return u
    return urllib.parse.urljoin(base, u)

IMGRE = re.compile(
    r'(?:<meta[^>]+(?:property|name)=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)'
    r'|<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']og:image["\']'
    r'|<img[^>]+src=["\']([^"\']+)["\'])', re.I)

BAD = re.compile(r"(logo|icon|sprite|placeholder|banner|payment|flag|cart|facebook|f-logo|footer|header|loading|spinner|default|no[-_]?image|pixel|blank)", re.I)

def scan(raw_html, base_url, limit=14):
    cands = []
    seen = set()
    for m in IMGRE.finditer(raw_html):
        u = next((g for g in m.groups() if g), None)
        if not u:
            continue
        u = absurl(base_url, u)
        low = u.lower()
        if low in seen:
            continue
        seen.add(low)
        if BAD.search(u):
            continue
        if not re.search(r"\.(jpe?g|png|webp|gif)(\?|$)|image", low):
            continue
        cands.append(u)
    # json-ld images
    for m in re.finditer(r'"image"\s*:\s*\[\s*"([^"]+)"', raw_html):
        u = absurl(base_url, m.group(1))
        if u.lower() not in seen:
            seen.add(u.lower()); cands.insert(0, u)
    return cands[:limit]

def grab(pos, url, save_cache=True):
    """Fetch page, cache text (fetchlib-style), print status + image candidates."""
    rec = {"status": 0, "final": url}
    try:
        r = raw_get(url)
        raw = r.read()
        rec["status"] = r.status
        rec["final"] = r.geturl()
        ct = (r.headers.get("Content-Type") or "").lower()
        if "pdf" in ct or url.lower().endswith(".pdf"):
            text = F.pdf_to_text(raw)
            imgs = []
        else:
            txt_raw = raw.decode("utf-8", errors="ignore")
            text = F.html_to_text(raw)
            imgs = scan(txt_raw, rec["final"])
        if save_cache:
            import fetchlib as FF
            os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "pagecache"), exist_ok=True)
            p = os.path.join(FF.PAGECACHE, f"{pos}.txt")
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(text)
        rec["text_len"] = len(text)
    except urllib.error.HTTPError as e:
        rec["status"] = e.code
    except Exception as e:
        rec["status"] = -1
        rec["err"] = repr(e)[:120]
    print(f"[{pos}] status={rec['status']} final={rec['final']} len={rec.get('text_len','')} err={rec.get('err','')}")
    for i, im in enumerate(imgs):
        print(f"   img[{i}] {im}")
    return rec, imgs

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        pos, url = arg.split("|", 1)
        grab(pos.strip(), url.strip())
