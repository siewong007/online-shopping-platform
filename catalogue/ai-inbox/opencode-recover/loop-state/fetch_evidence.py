#!/usr/bin/env python3
"""Fetch page + image evidence for ledger rows. Deterministic, cached, concurrent.

Modes:
  --positions <file|csv-inline>  explicit source_position list
  --states candidate,candidate_gate  rows in these ledger states
  --batch 50  concurrency

Writes/merges loop-state/evidence.json, pagecache/<pos>.txt, assets/<pos>.<ext>.
Thumbnail transform upgrade: tries larger transforms before accepting a small one;
records which URL actually returned pixels.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import ssl
from urllib import request as urlreq
from urllib.error import HTTPError, URLError

_NO_VERIFY_CTX = ssl.create_default_context()
_NO_VERIFY_CTX.check_hostname = False
_NO_VERIFY_CTX.verify_mode = ssl.CERT_NONE

STATE_DIR = Path(__file__).resolve().parent
ROOT = STATE_DIR.parents[3]  # online-shopping-platform/
RECOVER = STATE_DIR.parents[0]  # catalogue/ai-inbox/opencode-recover/
PAGECACHE = RECOVER / "pagecache"
ASSETS = RECOVER / "assets"
EVIDENCE = STATE_DIR / "evidence.json"
PAGECACHE.mkdir(parents=True, exist_ok=True)
ASSETS.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
THUMB_RE = re.compile(r"/(\d{2,4})x(\d{1,4})/")
UPGRADE_TEMPLATES = [
    lambda u, w, h: THUMB_RE.sub(f"/{max(w*4,800)}x{max(h*4,800)}/", u, count=1),
    lambda u, w, h: THUMB_RE.sub("/1000x1000/", u, count=1),
    lambda u, w, h: THUMB_RE.sub("/800x800/", u, count=1),
    lambda u, w, h: THUMB_RE.sub("", u, count=1),
]


def http_get(url: str, timeout=25, max_bytes=30_000_000):
    """Return (status, final_url, content_type, body_bytes). Retries once without
    TLS verification when the server presents an invalid/expired certificate."""
    for attempt, ctx in ((0, None), (1, _NO_VERIFY_CTX)):
        req = urlreq.Request(url, headers={
            "User-Agent": UA,
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9,ms;q=0.8,zh;q=0.7",
        })
        try:
            with urlreq.urlopen(req, timeout=timeout, context=ctx) as resp:
                status = resp.status
                final = resp.geturl()
                ct = resp.headers.get("Content-Type", "")
                body = resp.read(max_bytes)
                if attempt:
                    ev_note = "tls_unverified"
                    return status, final, ct.lower() + f"|{ev_note}", body
                return status, final, ct.lower(), body
        except HTTPError as e:
            return e.code, url, "", b""
        except (URLError, TimeoutError, OSError) as e:
            reason = getattr(e, "reason", None) or e
            if isinstance(reason, ssl.SSLError) or "CERTIFICATE_VERIFY_FAILED" in str(reason):
                continue  # retry unverified
            return -1, url, f"error:{type(e).__name__}", b""
    return -1, url, "error:ssl", b""


def png_dims(b: bytes):
    if len(b) > 33 and b[:8] == b"\x89PNG\r\n\x1a\n":
        w, h = struct.unpack(">II", b[16:24])
        return w, h
    return None


def jpeg_dims(b: bytes):
    if len(b) < 4 or b[:2] != b"\xff\xd8":
        return None
    i = 2
    n = len(b)
    while i + 9 < n:
        if b[i] != 0xFF:
            i += 1
            continue
        marker = b[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
            h, w = struct.unpack(">HH", b[i + 5:i + 9])
            return w, h
        seglen = struct.unpack(">H", b[i + 2:i + 4])[0]
        i += 2 + max(seglen, 2)
    return None


def webp_dims(b: bytes):
    if len(b) < 30 or b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        return None
    fmt = b[12:16]
    try:
        if fmt == b"VP8X":
            w = int.from_bytes(b[24:27], "little") + 1
            h = int.from_bytes(b[27:30], "little") + 1
            return w, h
        if fmt == b"VP8 ":
            w = struct.unpack("<H", b[26:28])[0] & 0x3FFF
            h = struct.unpack("<H", b[28:30])[0] & 0x3FFF
            return w, h
        if fmt == b"VP8L":
            bits = int.from_bytes(b[21:25], "little")
            w = (bits & 0x3FFF) + 1
            h = ((bits >> 14) & 0x3FFF) + 1
            return w, h
    except Exception:
        return None
    return None


def image_dims(b: bytes):
    for fn in (png_dims, jpeg_dims, webp_dims):
        d = fn(b)
        if d:
            return d
    return None, None


def ext_for(ct: str, body: bytes) -> str:
    if "png" in ct or body[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if "webp" in ct or body[:4] == b"RIFF":
        return "webp"
    if "gif" in ct or body[:3] == b"GIF":
        return "gif"
    if "svg" in ct:
        return "svg"
    return "jpg"


def looks_like_html(body: bytes) -> bool:
    head = body[:512].lstrip().lower()
    return head.startswith(b"<!doctype") or head.startswith(b"<html") or b"<body" in head


def fetch_row(pos: str, page_url: str, img_url: str) -> dict:
    ev = {"page_status": None, "page_final_url": page_url, "image_status": None,
          "image_final_url": img_url, "image_content_type": "", "image_bytes_len": 0,
          "image_sha256": "", "px_w": 0, "px_h": 0, "asset_file": "", "fetched_round": 0}
    # ---- page ----
    if page_url:
        st, fin, ct, body = http_get(page_url)
        if st == 200 and body and not looks_like_html(body) is False:
            pass
        ev["page_status"] = st
        ev["page_final_url"] = fin
        if st == 200 and body:
            text = decode_body(body)
            (PAGECACHE / f"{pos}.txt").write_text(text, encoding="utf-8")
            ev["page_text_bytes"] = len(body)
    # ---- image ----
    if img_url:
        best = None
        tried = []
        candidates = [img_url]
        m = THUMB_RE.search(img_url)
        if m:
            wpx, hpx = int(m.group(1)), int(m.group(2))
            if max(wpx, hpx) < 500:
                for tpl in UPGRADE_TEMPLATES:
                    nu = tpl(img_url, wpx, hpx)
                    if nu and nu != img_url and nu not in candidates:
                        candidates.insert(0, nu)
        for cand in candidates:
            st, fin, ct, body = http_get(cand)
            tried.append({"url": cand, "status": st, "ct": ct, "len": len(body)})
            pw, ph = image_dims(body) if body else (None, None)
            if st == 200 and ct.startswith("image/") and not looks_like_html(body) \
                    and pw and max(pw, ph) >= (500 if cand != img_url else 0):
                best = {"status": st, "final": fin, "ct": ct, "body": body, "pw": pw, "ph": ph}
                break
            if best is None and st == 200 and ct.startswith("image/") and not looks_like_html(body) and body:
                best = {"status": st, "final": fin, "ct": ct, "body": body, "pw": pw or 0, "ph": ph or 0}
        if best:
            sha = hashlib.sha256(best["body"]).hexdigest()
            ext = ext_for(best["ct"], best["body"])
            apath = ASSETS / f"{pos}.{ext}"
            apath.write_bytes(best["body"])
            ev.update({
                "image_status": best["status"], "image_final_url": best["final"],
                "image_content_type": best["ct"], "image_bytes_len": len(best["body"]),
                "image_sha256": sha, "px_w": best["pw"], "px_h": best["ph"],
                "asset_file": str(apath), "tried_image_urls": tried,
            })
        else:
            ev["image_status"] = tried[-1]["status"] if tried else -1
            ev["image_final_url"] = img_url
            ev["tried_image_urls"] = tried
    return ev


def decode_body(b: bytes) -> str:
    for enc in ("utf-8", "latin-1"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            continue
    return b.decode("utf-8", errors="ignore")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--positions", default="", help="comma-separated source_positions")
    ap.add_argument("--states", default="", help="comma list of ledger states to fetch")
    ap.add_argument("--round", type=int, default=0)
    ap.add_argument("--batch", type=int, default=50)
    ap.add_argument("--out", default=str(EVIDENCE), help="evidence JSON path (per-worker files supported)")
    args = ap.parse_args(argv)

    ev_path = Path(args.out)

    positions = [p.strip() for p in args.positions.split(",") if p.strip()]
    with open(STATE_DIR / "loop-ledger.csv", newline="", encoding="utf-8") as fh:
        rows = {r["source_position"]: r for r in csv.DictReader(fh)}
    if not positions and args.states:
        want = {s.strip() for s in args.states.split(",")}
        positions = [p for p, r in rows.items() if r.get("state") in want]

    ev_all = {}
    if ev_path.exists():
        ev_all = json.loads(ev_path.read_text(encoding="utf-8"))

    todo = []
    for p in positions:
        r = rows.get(p)
        if not r:
            print(f"skip unknown position {p}")
            continue
        todo.append((p, (r.get("official_product_page") or "").strip(),
                     (r.get("official_image_url") or "").strip()))

    print(f"fetching {len(todo)} rows, batch={args.batch}")
    done = 0
    for i in range(0, len(todo), args.batch):
        chunk = todo[i:i + args.batch]
        with ThreadPoolExecutor(max_workers=args.batch) as ex:
            futs = {ex.submit(fetch_row, p, pg, im): p for p, pg, im in chunk if pg or im}
            for fut in as_completed(futs):
                p = futs[fut]
                try:
                    ev = fut.result()
                except Exception as e:  # never let one row kill the batch
                    ev = {"page_status": -1, "image_status": -1, "error": repr(e)}
                ev["fetched_round"] = args.round
                ev_all[p] = ev
                done += 1
        ev_path.write_text(json.dumps(ev_all), encoding="utf-8")
        print(f"  batch {i // args.batch + 1}: cumulative {done}/{len(todo)}")
    ev_path.write_text(json.dumps(ev_all), encoding="utf-8")
    ok_img = sum(1 for p in positions if ev_all.get(p, {}).get("image_status") == 200)
    ok_page = sum(1 for p in positions if ev_all.get(p, {}).get("page_status") == 200)
    print(f"done: pages_ok={ok_page} images_ok={ok_img} total={len(positions)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
