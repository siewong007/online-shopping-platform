"""chat-02 shard-1110 helpers: raw fetch + cache + evidence + safe precheck."""
import sys, socket, os, re, urllib.request, urllib.error
socket.setdefaulttimeout(25)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetchlib as F
import io

def cache_page(pos, url, max_bytes=6_000_000):
    """Like F.fetch_page but returns (raw_bytes, text). Records identical evidence."""
    rec = {"page_status": 0, "page_final_url": url}
    raw = b""
    try:
        req = urllib.request.Request(url, headers=F.UA)
        r = urllib.request.urlopen(req, timeout=30)
        raw = r.read(max_bytes)
        rec["page_status"] = r.status
        rec["page_final_url"] = r.geturl()
        ct = (r.headers.get("Content-Type") or "").lower()
        if "pdf" in ct or url.lower().split("?")[0].endswith(".pdf"):
            text = F.pdf_to_text(raw)
        else:
            text = F.html_to_text(raw)
        os.makedirs(F.PAGECACHE, exist_ok=True)
        with open(os.path.join(F.PAGECACHE, f"{pos}.txt"), "w", encoding="utf-8") as fh:
            fh.write(text)
        rec["text_len"] = len(text)
    except urllib.error.HTTPError as e:
        rec["page_status"] = e.code
    except Exception as e:
        rec["page_status"] = -1
        rec["page_error"] = repr(e)[:120]
    F.append_evidence({str(pos): rec})
    return raw, rec

def precheck(pos, *needles):
    """gate-mirror: True if every needle (normalized) appears in cached page text."""
    p = os.path.join(F.PAGECACHE, f"{pos}.txt")
    if not os.path.exists(p):
        return False
    txt = open(p, encoding="utf-8", errors="ignore").read()
    nt = F.norm_text(txt)
    if not nt:
        return False
    ok = True
    for n in needles:
        nn = F.norm_text(n)
        if len(nn) >= 3 and nn not in nt:
            ok = False
    return ok

def imgs_in_html(raw):
    try:
        h = raw.decode("utf-8", errors="ignore")
    except Exception:
        h = raw.decode("latin-1", errors="ignore")
    out = set()
    for m in re.finditer(r'(?:src|href|content|data-src|data-lazy-src)\s*=\s*["\']([^"\']+\.(?:jpg|jpeg|png|webp)(?:\?[^"\']*)?)["\']', h, re.I):
        out.add(m.group(1))
    for m in re.finditer(r'https?://[^\s"\'<>]+?\.(?:jpg|jpeg|png|webp)', h, re.I):
        out.add(m.group(0))
    return sorted(out)

def resolve(u, base):
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("http"):
        return u
    from urllib.parse import urljoin
    return urljoin(base, u)
