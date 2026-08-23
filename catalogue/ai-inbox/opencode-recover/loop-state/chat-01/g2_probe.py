#!/usr/bin/env python3
"""G2 OEM-site probe: fetch page, list matching links, show og:image/title.

Usage: python g2_probe.py <url> [link_regex] [--img]
"""
import os, re, ssl, sys, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}
CTX = ssl._create_unverified_context() if os.environ.get("G2_INSECURE") else None


def get(u, timeout=25):
    req = urllib.request.Request(u, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout, context=CTX).read().decode("utf-8", "ignore")


def main():
    u = sys.argv[1]
    pat = re.compile(sys.argv[2]) if len(sys.argv) > 2 else None
    html = get(u)
    print("LEN", len(html))
    t = re.search(r"<title[^>]*>(.*?)</title>", html, re.S)
    print("TITLE:", (t.group(1).strip()[:160] if t else ""))
    og = re.search(r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)', html) or \
         re.search(r'content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html)
    if og:
        print("OG:IMG", og.group(1)[:250])
    seen = set()
    for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', html, re.S):
        href, txt = m.group(1), re.sub(r"<[^>]+>", "", m.group(2)).strip()
        if href.startswith("//"):
            href = "https:" + href
        if pat and not (pat.search(href) or pat.search(txt)):
            continue
        k = href.split("#")[0]
        if k in seen or not k.startswith("http"):
            continue
        seen.add(k)
        print("LINK:", k[:200], "|", txt[:80])
        if len(seen) > 60:
            break


if __name__ == "__main__":
    main()
