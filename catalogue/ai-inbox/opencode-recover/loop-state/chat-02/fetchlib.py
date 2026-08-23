"""chat-02 helper library: gate-exact fetching, hashing, evidence recording.
Imported by chat-02 sub-agents ONLY. Never modifies anything outside chat-02/
except the sanctioned shared pagecache/ and assets/ paths.
"""
import hashlib, json, io, os, re, sys, urllib.request, urllib.error

STATE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover"
CHAT2 = os.path.join(STATE, "loop-state", "chat-02")
PAGECACHE = os.path.join(STATE, "pagecache")
ASSETS_SHARED = os.path.join(STATE, "assets")
EVIDENCE_PATH = os.path.join(CHAT2, "evidence.json")
HASHES_PATH = os.path.join(CHAT2, "hashes.csv")

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/pdf,image/*;q=0.8,*/*;q=0.5",
      "Accept-Language": "en-MY,en;q=0.9,zh;q=0.8"}

def _open(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout)

def norm_text(s):
    return re.sub(r"[^0-9A-Za-z]+", "", s or "").upper()

def html_to_text(raw):
    try:
        txt = raw.decode("utf-8", errors="ignore")
    except Exception:
        txt = raw.decode("latin-1", errors="ignore")
    txt = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", txt)
    txt = re.sub(r"(?is)<[^>]+>", " ", txt)
    txt = re.sub(r"&nbsp;?", " ", txt)
    txt = re.sub(r"&amp;", "&", txt)
    txt = re.sub(r"[ \t\r]+", " ", txt)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    return txt

def pdf_to_text(raw):
    try:
        import pypdf
        r = pypdf.PdfReader(io.BytesIO(raw))
        return "\n".join((p.extract_text() or "") for p in r.pages[:12])
    except Exception:
        try:
            from PyPDF2 import PdfReader
            r = PdfReader(io.BytesIO(raw))
            return "\n".join((p.extract_text() or "") for p in r.pages[:12])
        except Exception:
            return ""

def fetch_page(pos, url, max_bytes=3_000_000):
    """Fetch a product page/PDF; cache normalized text at pagecache/<pos>.txt.
    Returns dict(page_status, page_final_url, text_len)."""
    rec = {"page_status": 0, "page_final_url": url}
    try:
        r = _open(url)
        raw = r.read(max_bytes)
        rec["page_status"] = r.status
        rec["page_final_url"] = r.geturl()
        ct = (r.headers.get("Content-Type") or "").lower()
        if "pdf" in ct or url.lower().endswith(".pdf"):
            text = pdf_to_text(raw)
        else:
            text = html_to_text(raw)
        os.makedirs(PAGECACHE, exist_ok=True)
        with open(os.path.join(PAGECACHE, f"{pos}.txt"), "w", encoding="utf-8") as fh:
            fh.write(text)
        rec["text_len"] = len(text)
    except urllib.error.HTTPError as e:
        rec["page_status"] = e.code
    except Exception as e:
        rec["page_status"] = -1
        rec["page_error"] = repr(e)[:120]
    append_evidence({str(pos): rec})
    return rec

def img_size(raw):
    from PIL import Image
    im = Image.open(io.BytesIO(raw))
    return im.size  # (w,h)

IMG_EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
           "image/gif": ".gif", "image/avif": ".avif", "image/jpg": ".jpg"}

def fetch_image(pos, url, fetched_round=1):
    """Download image bytes; hash, measure, store shared asset + local copy,
    append evidence + hashes rows. Returns evidence dict."""
    ev = {"fetched_round": fetched_round, "image_status": 0, "image_final_url": url}
    try:
        r = _open(url, timeout=40)
        raw = r.read(15_000_000)
        ev["image_status"] = r.status
        ev["image_final_url"] = r.geturl()
        ct = (r.headers.get("Content-Type") or "application/octet-stream").split(";")[0].strip().lower()
        ev["image_content_type"] = ct
        ev["image_bytes_len"] = len(raw)
        ev["image_sha256"] = hashlib.sha256(raw).hexdigest()
        if ev["image_bytes_len"] >= 20000 and ct.startswith("image/"):
            w, h = img_size(raw)
            ev["px_w"], ev["px_h"] = w, h
            ext = IMG_EXT.get(ct, ".jpg")
            os.makedirs(ASSETS_SHARED, exist_ok=True)
            with open(os.path.join(ASSETS_SHARED, f"{pos}{ext}"), "wb") as fh:
                fh.write(raw)
            loc = os.path.join(CHAT2, "assets")
            os.makedirs(loc, exist_ok=True)
            with open(os.path.join(loc, f"{pos}{ext}"), "wb") as fh:
                fh.write(raw)
        else:
            ev["px_w"] = ev["px_h"] = 0
    except urllib.error.HTTPError as e:
        ev["image_status"] = e.code
    except Exception as e:
        ev["image_status"] = -1
        ev["image_error"] = repr(e)[:160]
    append_evidence({str(pos): ev})
    append_hashes(str(pos), ev)
    return ev

def append_evidence(chunk):
    os.makedirs(CHAT2, exist_ok=True)
    line = json.dumps({"_t": __import__("time").time(), "rec": chunk}, ensure_ascii=False)
    with open(os.path.join(CHAT2, "evidence-log.jsonl"), "a", encoding="utf-8") as fh:
        fh.write(line + "\n")
    rebuild_evidence_view()

def rebuild_evidence_view():
    data = {}
    lp = os.path.join(CHAT2, "evidence-log.jsonl")
    if os.path.exists(lp):
        for ln in open(lp, encoding="utf-8", errors="ignore"):
            ln = ln.strip()
            if not ln:
                continue
            try:
                chunk = json.loads(ln)["rec"]
            except Exception:
                continue
            for k, v in chunk.items():
                cur = dict(data.get(k) or {})
                cur.update({kk: vv for kk, vv in v.items() if vv is not None})
                data[k] = cur
    tmp = EVIDENCE_PATH + ".tmp"
    json.dump(data, open(tmp, "w", encoding="utf-8"))
    os.replace(tmp, EVIDENCE_PATH)

def load_evidence():
    rebuild_evidence_view()
    if os.path.exists(EVIDENCE_PATH):
        return json.load(open(EVIDENCE_PATH, encoding="utf-8"))
    return {}

def append_hashes(pos, ev):
    hdr = ["source_position", "item_code", "uom", "official_image_url", "image_sha256",
           "image_px_w", "image_px_h", "image_bytes"]
    newfile = not os.path.exists(HASHES_PATH)
    with open(HASHES_PATH, "a", encoding="utf-8", newline="") as fh:
        import csv as _csv
        w = _csv.writer(fh)
        if newfile:
            w.writerow(hdr)
        w.writerow([pos, "", "", ev.get("image_final_url", ""), ev.get("image_sha256", ""),
                    ev.get("px_w", 0), ev.get("px_h", 0), ev.get("image_bytes_len", 0)])

def model_variants(detected_model, item_code):
    out = []
    dm = (detected_model or "").strip()
    ic = (item_code or "").strip()
    if dm:
        n = norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [norm_text(t) for t in re.split(r"[^0-9A-Za-z]+", dm) if norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append(("TOKENS:", longtoks))
    parts = ic.split("-")
    if len(parts) > 1:
        tail = "".join(parts[1:])
        n = norm_text(tail)
        if len(n) >= 4:
            out.append(n)
        segs = [norm_text(s) for s in parts[1:] if norm_text(s)]
        for i in range(len(segs)):
            acc = ""
            for j in range(i, len(segs)):
                acc += segs[j]
                if len(acc) >= 5 and any(c.isdigit() for c in acc):
                    out.append(acc)
    seen, uniq = set(), []
    for v in out:
        if v not in seen:
            seen.add(v); uniq.append(v)
    return uniq

def precheck_model_in_page(pos, detected_model, item_code):
    """Local dry-run of gate.model_present against cached page text."""
    p = os.path.join(PAGECACHE, f"{pos}.txt")
    if not os.path.exists(p):
        return False
    nt = norm_text(open(p, encoding="utf-8", errors="ignore").read())
    if not nt:
        return False
    for v in model_variants(detected_model, item_code):
        if isinstance(v, str) and v.startswith("TOKENS:"):
            toks = [t for t in v.split(":", 1)[1].split("|") if t]
            if toks and all(t in nt for t in toks):
                return True
        elif isinstance(v, str) and len(v) >= 4 and v in nt:
            return True
    return False


def model_variants(detected_model, item_code):
    out = []
    dm = (detected_model or '').strip()
    ic = (item_code or '').strip()
    if dm:
        n = norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [norm_text(t) for t in re.split(r'[^0-9A-Za-z]+', dm) if norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append('TOKENS:' + '|'.join(longtoks))
    parts = ic.split('-')
    if len(parts) > 1:
        tail = ''.join(parts[1:])
        n = norm_text(tail)
        if len(n) >= 4:
            out.append(n)
        segs = [norm_text(s) for s in parts[1:] if norm_text(s)]
        for i in range(len(segs)):
            acc = ''
            for j in range(i, len(segs)):
                acc += segs[j]
                if len(acc) >= 5 and any(c.isdigit() for c in acc):
                    out.append(acc)
    seen, uniq = set(), []
    for v in out:
        if v not in seen:
            seen.add(v); uniq.append(v)
    return uniq

def precheck_model_in_page(pos, detected_model, item_code):
    pf = os.path.join(PAGECACHE, str(pos) + '.txt')
    if not os.path.exists(pf):
        return False
    nt = norm_text(open(pf, encoding='utf-8', errors='ignore').read())
    if not nt:
        return False
    for v in model_variants(detected_model, item_code):
        if v.startswith('TOKENS:'):
            toks = [t for t in v.split(':', 1)[1].split('|') if t]
            if toks and all(t in nt for t in toks):
                return True
        elif len(v) >= 4 and v in nt:
            return True
    return False
