#!/usr/bin/env python3
"""Chat 05 batch fetcher.

Input: JSON file with {"round": N, "items": [{"pos","page_url","image_url"}, ...]}
For each item:
  - GET page -> record status/final url; extract visible text; save to
    opencode-recover/pagecache/<pos>.txt (what gate.py reads) and a URL-hash
    copy under ai-inbox/pagecache/ for cross-chat reuse.
  - GET image bytes -> status/content-type/len/sha256/pixels; save asset
    ai-inbox/assets/<pos>.<ext>.
Appends evidence entries into chat-05/evidence-chat05.json and rows into
chat-05/hashes.csv.
"""
import csv, hashlib, json, re, sys, io
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib import request as ureq
from urllib.error import HTTPError, URLError

HERE = Path(__file__).resolve().parent
RECOVER = HERE.parent.parent          # .../opencode-recover
AIINBOX = RECOVER.parent              # .../ai-inbox
PC_GATE = RECOVER / "pagecache"       # gate.py reads <pos>.txt here
PC_URL = AIINBOX / "pagecache"        # shared url-keyed cache
ASSETS = AIINBOX / "assets"
EVID = HERE / "evidence-chat05.json"
HASHES = HERE / "hashes.csv"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

TAG_RE = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>", re.S | re.I)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)
HTML_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"[ \t\r\f\v]+")
BLANK_RE = re.compile(r"\n{3,}")

EXT_BY_CT = {
    "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
    "image/webp": ".webp", "image/gif": ".gif", "image/bmp": ".bmp",
    "image/tiff": ".tif", "image/avif": ".avif",
}


def fetch(url: str, timeout: int = 30):
    req = ureq.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    with ureq.build_opener().open(req, timeout=timeout) as resp:
        return resp.status, resp.geturl(), dict(resp.headers), resp.read()


def html_to_text(body: bytes) -> str:
    try:
        html = body.decode("utf-8", errors="ignore")
    except Exception:
        html = body.decode("latin-1", errors="ignore")
    html = COMMENT_RE.sub(" ", TAG_RE.sub(" ", html))
    txt = HTML_RE.sub("\n", html)
    txt = (txt.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
             .replace("&quot;", '"').replace("&#39;", "'").replace("&nbsp;", " "))
    lines = [WS_RE.sub(" ", ln).strip() for ln in txt.splitlines()]
    return BLANK_RE.sub("\n\n", "\n".join(ln for ln in lines if ln))


def get_px(data: bytes):
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        return im.size
    except Exception:
        return (None, None)


def do_item(item: dict, rnd: int) -> dict:
    pos = str(item["pos"])
    rec = {
        "pos": pos,
        "fetched_round": rnd,
        "page_url": item.get("page_url", ""),
        "image_url": item.get("image_url", ""),
        "page_status": None, "page_final_url": "",
        "image_status": None, "image_final_url": "",
        "image_content_type": "", "image_bytes_len": 0,
        "px_w": None, "px_h": None, "image_sha256": "",
    }
    # ---- page ----
    purl = item.get("page_url") or ""
    if purl:
        cache_key = PC_URL / ("u-" + hashlib.sha1(purl.encode()).hexdigest()[:24] + ".txt")
        if cache_key.exists():
            rec["page_status"] = 200
            rec["page_final_url"] = purl
            PC_GATE.mkdir(parents=True, exist_ok=True)
            (PC_GATE / f"{pos}.txt").write_text(cache_key.read_text(encoding="utf-8", errors="ignore"),
                                                encoding="utf-8")
        else:
            try:
                st, fin, hdr, body = fetch(purl)
                ct = (hdr.get("Content-Type") or "").lower()
                text = html_to_text(body) if "html" in ct else body.decode("utf-8", errors="ignore")
                if "pdf" in ct:
                    text = f"[PDF {len(body)} bytes]"
                rec["page_status"] = st
                rec["page_final_url"] = fin
                PC_URL.mkdir(parents=True, exist_ok=True)
                cache_key.write_text(text, encoding="utf-8")
                PC_GATE.mkdir(parents=True, exist_ok=True)
                (PC_GATE / f"{pos}.txt").write_text(text, encoding="utf-8")
            except HTTPError as e:
                rec["page_status"] = e.code
            except Exception as e:
                rec["page_status"] = -1
                rec["page_final_url"] = f"ERR:{type(e).__name__}"
    # ---- image ----
    iurl = item.get("image_url") or ""
    if iurl:
        try:
            st, fin, hdr, data = fetch(iurl)
            ct = (hdr.get("Content-Type") or "").split(";")[0].strip().lower()
            rec["image_status"] = st
            rec["image_final_url"] = fin
            rec["image_content_type"] = ct
            rec["image_bytes_len"] = len(data)
            w, h = get_px(data) if ct.startswith("image/") else (None, None)
            rec["px_w"], rec["px_h"] = w, h
            if ct.startswith("image/") and len(data) > 0:
                rec["image_sha256"] = hashlib.sha256(data).hexdigest()
                ext = EXT_BY_CT.get(ct) or Path(ureq.urlparse(fin).path).suffix.lower() or ".bin"
                ASSETS.mkdir(parents=True, exist_ok=True)
                (ASSETS / f"{pos}{ext}").write_bytes(data)
        except HTTPError as e:
            rec["image_status"] = e.code
        except Exception as e:
            rec["image_status"] = -1
            rec["image_final_url"] = f"ERR:{type(e).__name__}"
    return rec


def main():
    batch_path = Path(sys.argv[1])
    rnd = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    batch = json.loads(batch_path.read_text(encoding="utf-8"))
    items = batch["items"]
    results = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(do_item, it, rnd) for it in items]
        for fu in as_completed(futs):
            try:
                results.append(fu.result())
            except Exception as e:
                results.append({"pos": "?", "error": repr(e)})
    # merge into evidence store
    store = {}
    if EVID.exists():
        try:
            store = json.loads(EVID.read_text(encoding="utf-8"))
        except Exception:
            store = {}
    hash_rows = []
    for r in sorted(results, key=lambda x: str(x.get("pos"))):
        pos = str(r.get("pos"))
        old = store.get(pos)
        if old is None or (r.get("fetched_round") or 0) >= (old.get("fetched_round") or 0):
            store[pos] = r
        if r.get("image_sha256"):
            hash_rows.append({
                "source_position": pos,
                "item_code": "", "uom": "",
                "official_image_url": r.get("image_final_url") or r.get("image_url", ""),
                "image_sha256": r["image_sha256"],
                "image_px_w": r.get("px_w") or "", "image_px_h": r.get("px_h") or "",
                "image_bytes": r.get("image_bytes_len") or 0,
            })
    EVID.write_text(json.dumps(store, indent=1), encoding="utf-8")
    newfile = not HASHES.exists()
    with open(HASHES, "a", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_position", "item_code", "uom",
                                           "official_image_url", "image_sha256",
                                           "image_px_w", "image_px_h", "image_bytes"])
        if newfile:
            w.writeheader()
        w.writerows(hash_rows)
    ok_pages = sum(1 for r in results if r.get("page_status") == 200)
    ok_imgs = sum(1 for r in results if r.get("image_status") == 200 and r.get("image_bytes_len", 0) >= 20000)
    print(json.dumps({"requested": len(items), "pages_200": ok_pages,
                      "images_200_ge20k": ok_imgs,
                      "errors": sum(1 for r in results if r.get("error"))}))


if __name__ == "__main__":
    main()
