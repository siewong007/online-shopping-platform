#!/usr/bin/env python3
"""ESC-2 direct probe helper: GET url(s), print status/title/key snippets."""
import re, sys
sys.path.insert(0, r"catalogue\ai-inbox\opencode-recover\loop-state")
from fetch_evidence import http_get

def probe(url, patterns=None, max_show=400):
    st, fin, ct, body = http_get(url, timeout=30)
    out = [f"URL {url}", f"  status={st} final={fin} ct={ct} len={len(body)}"]
    if st == 200 and body:
        text = body.decode("utf-8", errors="ignore")
        m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
        if m:
            title = re.sub(r"\s+", " ", m.group(1)).strip()[:160]
            out.append("  title=" + title)
        if patterns:
            for pat in patterns:
                hits = re.findall(pat, text, re.I)
                out.append(f"  pat/{pat}/ -> {len(hits)} hits: {hits[:6]}")
        imgs = re.findall(r'(?:src|href|data-src|content)="([^"]+\.(?:jpg|jpeg|png|webp))"', text, re.I)
        if imgs:
            seen = []
            for u in imgs:
                if u not in seen:
                    seen.append(u)
            out.append("  imgs[0..14]: " + " | ".join(seen[:14]))
        links = re.findall(r'href="([^"]*(?:product|item|shop|catalog)[^"]*)"', text, re.I)
        uniq = []
        for u in links:
            if u not in uniq:
                uniq.append(u)
        if uniq:
            out.append("  plinks[0..10]: " + " | ".join(uniq[:10]))
    print("\n".join(out))
    return st, body

if __name__ == "__main__":
    pats = sys.argv[2].split("|") if len(sys.argv) > 2 else None
    probe(sys.argv[1], pats)
