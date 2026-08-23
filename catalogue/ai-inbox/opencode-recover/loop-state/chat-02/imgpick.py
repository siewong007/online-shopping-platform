"""chat-02 helper: fetch raw HTML of a page, list candidate product image URLs.
Usage: python imgpick.py <url>
Prints status, then image candidates sorted by likely size keywords, with
absolute URLs resolved against the page.
"""
import sys, re, urllib.request, urllib.parse, posixpath

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,*/*;q=0.8", "Accept-Language": "en-MY,en;q=0.9"}

def main(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        r = urllib.request.urlopen(req, timeout=25)
        raw = r.read(4_000_000).decode("utf-8", errors="ignore")
        final = r.geturl()
        ct = r.headers.get("Content-Type", "")
    except Exception as e:
        print("FETCH FAIL", repr(e)[:140])
        return
    print("status ok ct=", ct, "final=", final, "len=", len(raw))
    cands = {}
    for m in re.finditer(r'<img\b[^>]*>', raw, re.I):
        tag = m.group(0)
        src = None
        for attr in ("data-src", "data-original", "data-large_image", "data-lazy-src", "src"):
            g = re.search(attr + r'=["\']([^"\']+)["\']', tag, re.I)
            if g:
                src = g.group(1)
                break
        if not src:
            continue
        if src.startswith("data:"):
            continue
        src = urllib.parse.urljoin(final, src.strip())
        low = src.lower()
        score = 0
        for kw, sc in (("large", 3), ("big", 2), ("full", 2), ("zoom", 3), ("main", 2), ("product", 1), ("catalog", 1)):
            if kw in low:
                score += sc
        for bad in ("logo", "icon", "sprite", "banner", "payment", "facebook", "whatsapp", "cart", "placeholder"):
            if bad in low:
                score -= 5
        cands[src] = score
    # also og:image and JSON "image"
    for pat in (r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)',
                r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']',
                r'"image"\s*:\s*\[\s*"([^"]+)"', r'"image"\s*:\s*\{[^}]*?"url"\s*:\s*"([^"]+)"'):
        for m in re.finditer(pat, raw):
            u = urllib.parse.urljoin(final, m.group(1).replace("\\/", "/"))
            cands[u] = max(cands.get(u, -99), 6)
    ranked = sorted(cands.items(), key=lambda kv: -kv[1])
    shown = 0
    for u, s in ranked:
        ext = posixpath.splitext(urllib.parse.urlparse(u).path)[1].lower()
        if ext and ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"):
            continue
        print(f"[s{s}] {u}")
        shown += 1
        if shown >= 15:
            break

if __name__ == "__main__":
    main(sys.argv[1])
