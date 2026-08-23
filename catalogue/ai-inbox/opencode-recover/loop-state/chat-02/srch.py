"""chat-02 helper: Bing websearch fallback while exa MCP is rate-limited.
Usage: python srch.py "query one" "query two" ...
Prints top results per query as: [i] title | url
"""
import sys, time, re, html, urllib.request, urllib.parse

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "en-MY,en;q=0.9"}

def bing(q, n=6):
    url = "https://www.bing.com/search?q=" + urllib.parse.quote(q) + "&count=12&mkt=en-MY"
    req = urllib.request.Request(url, headers=UA)
    try:
        raw = urllib.request.urlopen(req, timeout=20).read().decode("utf-8", errors="ignore")
    except Exception as e:
        return [("FAIL " + repr(e)[:80], "")]
    out, seen = [], set()
    def resolve(u):
        u = html.unescape(u)
        if u.startswith("http") and "bing.com/ck" not in u[:40]:
            return u
        g = re.search(r'[?&]u=a1([^&]+)', u)
        if not g:
            return ""
        import base64
        pad = g.group(1) + "=" * (-len(g.group(1)) % 4)
        try:
            return base64.urlsafe_b64decode(pad).decode("utf-8", errors="ignore")
        except Exception:
            return ""
    for li in re.split(r'<li class="b_algo', raw)[1:]:
        m = re.search(r'<h2[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', li, re.S)
        if not m:
            m = re.search(r'<cite>(.*?)</cite>', li, re.S)
            if not m:
                continue
            u = resolve("https://" + re.sub("<[^>]+>", "", m.group(1)).split()[0])
            t = u
            if not u or u in seen:
                continue
            seen.add(u); out.append((t[:90], u))
            if len(out) >= n:
                break
            continue
        u = resolve(m.group(1))
        t = html.unescape(re.sub("<[^>]+>", "", m.group(2))).strip()
        if not u or u in seen:
            continue
        seen.add(u)
        out.append((t[:90], u))
        if len(out) >= n:
            break
    return out

if __name__ == "__main__":
    for q in sys.argv[1:]:
        print("=== q:", q, flush=True)
        res = bing(q)
        if not res:
            print("  (no organic results)", flush=True)
        for i, (t, u) in enumerate(res):
            print(f"  [{i}] {t} | {u}", flush=True)
        time.sleep(1.2)
