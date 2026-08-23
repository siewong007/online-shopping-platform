#!/usr/bin/env python3
"""Sitemap-based PDP harvest, D2 variant — search-engine-independent research.

Copy of ../sitemap_harvest.py extended for slot D2:
 - BRAND_DOMAINS += dealer/OEM domains (jllelectrical, smjelectrical,
   samajaya.onesyncapp, esales, mybigwarehouse, unimechengineering,
   stanleytools.global, khind).
 - brand override by item_code prefix (several D2 rows have blank detected_brand).
 - CCT/watt-aware hit scoring so sibling SKUs don't collapse onto one family URL.
 - cross-SKU claim tracking inside one run (two item_codes never share one PDP).
 - collects multiple image candidates per PDP (og:image first, then <img> srcs,
   skipping nav/logo junk).

Usage (workdir = online-shopping-platform/):
  python catalogue/ai-inbox/opencode-recover/loop-state/chat-01/sitemap_d2.py \
      --brief catalogue/ai-inbox/opencode-recover/loop-state/chat-01/brief-d2.csv \
      --out catalogue/ai-inbox/opencode-recover/loop-state/chat-01/harvest-d2.csv \
      --evidence catalogue/ai-inbox/opencode-recover/loop-state/chat-01/evidence-harvest-d2.json \
      [--domains dom1,dom2]
Brief CSV needs: source_position,item_code,uom,display_name,detected_brand,detected_model
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fetch_evidence import http_get, decode_body  # noqa: E402

BRAND_DOMAINS = {
    # official brands
    "megaman": ["megaman.com.my", "www.megamanlighting.com"],
    "khind": ["khind.com.my", "www.khind.com.my"],
    "mrmark": ["www.mrmarks.com", "mrmarks.com"],
    "techplas": ["techplas.com.my", "www.techplas.com.my"],
    "unimech": ["unimechengineering.com.my", "www.unimechengineering.com.my"],
    "stanley": ["my.stanleytools.global", "www.stanleytools.com",
                "www.stanley-black-decker.com.my"],
    # dealer / OEM channels (D2 lever)
    "jll": ["www.jllelectrical.com.my", "jllelectrical.com.my"],
    "smj": ["smjelectrical.com.my", "www.smjelectrical.com.my"],
    "samajaya": ["samajaya.onesyncapp.com"],
    "esales": ["esales.com.my", "www.esales.com.my"],
    "mybigwarehouse": ["mybigwarehouse.com.my", "www.mybigwarehouse.com.my"],
}

# D2 rows often have blank detected_brand -> map by item_code prefix.
PREFIX_BRAND = [
    ("ELE-D/L-MEG-", "megaman"),
    ("ELE-D/L-MGM-", "megaman"),
    ("PIP-UPVC-5255-", "unimech"),
    ("FAS-RIV-PAT-", "jaguar"),
    ("CUT-DIS-MARK-", "mrmark"),
    ("STA-GRI-", "stanley"),
    ("HHD-FLU-M0676-", "techplas"),
]
PREFIX_DOMAINS = {
    # jaguar rivets: try general hardware dealers reachable w/o search engines
    "jaguar": ["mybigwarehouse.com.my"],
    # Megaman rows: dealer/OEM channels too (per-CCT listings live on dealers)
    "megaman": ["www.jllelectrical.com.my", "smjelectrical.com.my",
                "samajaya.onesyncapp.com", "esales.com.my",
                "mybigwarehouse.com.my"],
    "techplas": ["techplas.com.my"],
}

OG_IMG_RE = re.compile(
    r"<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)[\"']", re.I)
IMG_RE = re.compile(r"<img[^>]+src=[\"']([^\"']+\.(?:png|jpe?g|webp))[\"']", re.I)
CCT_RE = re.compile(r"(3000|4000|5000|6500)\s*K", re.I)
JUNK_RE = re.compile(
    r"logo|icon|sprite|banner|facebook|whatsapp|payment|placeholder|loading|"
    r"default|avatar|watermark|footer|header", re.I)


def norm_token(s: str) -> str:
    return re.sub(r"[^0-9a-z]", "", (s or "").lower())


def cct_of(sku: dict):
    m = CCT_RE.search(sku.get("display_name", "") or "") or \
        CCT_RE.search(sku.get("item_code", "") or "")
    if m:
        return norm_token(m.group(0))
    return ""


def sku_tokens(brand: str, item_code: str, model: str, display_name: str):
    """Distinctive normalized tokens to hunt for in slugs."""
    toks = set()
    parts = (item_code or "").split("-")
    segs = [norm_token(p) for p in parts if norm_token(p)]
    for i in range(len(segs)):
        acc = ""
        for j in range(i, len(segs)):
            acc += segs[j]
            if len(acc) >= 5 and any(c.isdigit() for c in acc):
                toks.add(acc)
    n = norm_token(model)
    if len(n) >= 4:
        toks.add(n)
        for t in re.split(r"[^0-9A-Za-z]+", model or ""):
            nt = norm_token(t)
            if len(nt) >= 5 and any(c.isdigit() for c in nt):
                toks.add(nt)
    for t in re.split(r"[^0-9A-Za-z]+", display_name or ""):
        nt = norm_token(t)
        if len(nt) >= 5 and any(c.isdigit() for c in nt) and not t.isdigit():
            toks.add(nt)
    return toks


def get_sitemaps(domain: str, cap: int, cache: dict) -> list[str]:
    if domain in cache:
        return cache[domain]
    urls: list[str] = []
    seen_sm = set()
    queue = []
    st, _, _, body = http_get(f"https://{domain}/robots.txt", timeout=20)
    if st == 200 and body:
        rp_txt = decode_body(body)
        for line in rp_txt.splitlines():
            if line.lower().startswith("sitemap:"):
                queue.append(line.split(":", 1)[1].strip())
    if not queue:
        queue = [f"https://{domain}/sitemap.xml", f"https://{domain}/sitemap_index.xml",
                 f"https://{domain}/wp-sitemap.xml", f"https://{domain}/sitemap-pt-product-0.xml"]
    while queue and len(urls) < cap:
        sm = queue.pop(0)
        if sm in seen_sm:
            continue
        seen_sm.add(sm)
        st, fin, ct, body = http_get(sm, timeout=25)
        if st != 200 or not body:
            continue
        txt = decode_body(body)
        locs = re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", txt)
        for loc in locs:
            if loc.endswith(".xml") or "sitemap" in urlparse(loc).path.lower():
                if len(queue) < 40:
                    queue.append(loc)
            else:
                urls.append(loc)
            if len(urls) >= cap:
                break
    cache[domain] = urls
    print(f"  sitemap {domain}: {len(urls)} urls")
    return urls


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--brief", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--evidence", required=True)
    ap.add_argument("--round", type=int, default=3)
    ap.add_argument("--batch", type=int, default=20)
    ap.add_argument("--max-per-domain", type=int, default=4000)
    args = ap.parse_args()

    skus = list(csv.DictReader(open(args.brief, encoding="utf-8-sig")))
    ev_all = {}
    evp = Path(args.evidence)
    if evp.exists():
        ev_all = json.loads(evp.read_text(encoding="utf-8"))

    domain_cache: dict[str, list[str]] = {}
    out_rows = []
    claimed_pdp: dict[str, str] = {}   # pdp url -> source_position that claimed it
    claimed_img: dict[str, str] = {}   # image url -> source_position

    groups = defaultdict(list)
    for s in skus:
        ic = s.get("item_code", "")
        b = norm_token(s.get("detected_brand", ""))
        bk = None
        if b and b != "none":
            for key in BRAND_DOMAINS:
                if len(b) >= 3 and (key in b or b in key):
                    bk = key
                    break
        if bk is None:
            for pref, mapped in PREFIX_BRAND:
                if ic.startswith(pref):
                    bk = mapped
                    break
        groups[bk].append(s)

    from concurrent.futures import ThreadPoolExecutor

    for bk, group in groups.items():
        domains = BRAND_DOMAINS.get(bk, []) + PREFIX_DOMAINS.get(bk, [])
        if not domains:
            for s in group:
                out_rows.append({**{k: s.get(k, "") for k in
                                    ("source_position", "item_code", "uom")},
                                 "pdp_url": "", "image_url": "", "alt_images": "",
                                 "decision": "pending",
                                 "reason": f"q:sitemap:none no domain map for brand {bk!r}"})
            continue
        slug_urls: dict[str, str] = {}
        tried_domains = []
        for d in dict.fromkeys(domains):
            tried_domains.append(d)
            try:
                for u in get_sitemaps(d, args.max_per_domain, domain_cache):
                    slug_urls[u.lower()] = u
            except Exception as e:
                print(f"  sitemap fail {d}: {e!r}")
        low_list = [(norm_token(u), u) for u in slug_urls]

        def find_hits(toks):
            hits = []
            seen = set()
            for nu, u in low_list:
                for t in sorted(toks, key=len, reverse=True):
                    if len(t) >= 5 and t in nu:
                        if u not in seen:
                            hits.append((u, t))
                            seen.add(u)
                        break
            return hits[:12]

        jobs = []
        for s in group:
            toks = sku_tokens(s.get("detected_brand", ""), s.get("item_code", ""),
                              s.get("detected_model", ""), s.get("display_name", ""))
            cct = cct_of(s)
            hits = find_hits(toks)

            def score(u_t):
                u, t = u_t
                sc = 0
                ul = u.lower()
                if ".com.my" in ul:
                    sc += 2
                if any(m in ul for m in ("/product", "/products", "/p/", "-p-", "showproducts")):
                    sc += 1
                sc += min(len(t), 12) / 12
                if cct and cct in norm_token(u):
                    sc += 3      # per-CCT listing beats family page
                elif cct:
                    sc -= 1.5    # family page when a CCT-specific one exists
                if claimed_pdp.get(u):
                    sc -= 8      # another D2 SKU already claims this PDP
                return -sc

            best = sorted(hits, key=score)[0][0] if hits else None
            jobs.append((s, best, [h[0] for h in hits]))

        def process(job):
            s, pdp, alt_pdps = job
            pos = s["source_position"]
            base = {k: s.get(k, "") for k in ("source_position", "item_code", "uom")}
            if not pdp:
                return {**base, "pdp_url": "", "image_url": "", "alt_images": "",
                        "decision": "pending",
                        "reason": (f"harvest: no sitemap slug match "
                                   f"(q:sitemap:{','.join(tried_domains)} "
                                   f"{len(slug_urls)} urls scanned)")}
            claimed_pdp[pdp] = pos
            st, fin, ct, body = http_get(pdp, timeout=25)
            txt = ""
            if st == 200 and body:
                txt = decode_body(body)
                Path("catalogue/ai-inbox/opencode-recover/pagecache").mkdir(exist_ok=True)
                (Path("catalogue/ai-inbox/opencode-recover/pagecache") / f"{pos}.txt").write_text(
                    txt, encoding="utf-8")
            imgs = []
            if txt:
                m = OG_IMG_RE.search(txt)
                if m:
                    imgs.append(m.group(1))
                for u in IMG_RE.findall(txt)[:40]:
                    if JUNK_RE.search(u):
                        continue
                    if u not in imgs:
                        imgs.append(u)
                imgs = imgs[:8]
            img = imgs[0] if imgs else None
            if img:
                claimed_img.setdefault(img.lower(), pos)
            ev_all[pos] = {"page_status": st, "page_final_url": fin,
                           "image_candidates": imgs, "fetched_round": args.round}
            return {**base, "pdp_url": pdp, "image_url": img or "",
                    "alt_images": "|".join(imgs[1:6]),
                    "alt_pdps": "|".join(alt_pdps[:4]),
                    "decision": ("candidate" if (st == 200 and img) else "pending"),
                    "reason": (f"harvest: q:sitemap:{','.join(tried_domains)} "
                               f"slug-match p:{pdp} status={st} og/img={img or '-'} "
                               f"alts={len(imgs) - 1 if imgs else 0}")}

        with ThreadPoolExecutor(max_workers=args.batch) as ex:
            for res in ex.map(process, jobs):
                out_rows.append(res)

    cols = ["source_position", "item_code", "uom", "pdp_url", "image_url",
            "alt_images", "alt_pdps", "decision", "reason"]
    with open(args.out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(out_rows)
    evp.write_text(json.dumps(ev_all), encoding="utf-8")
    print(f"harvest rows written: {len(out_rows)} -> {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
