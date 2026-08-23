import socket, ssl, re, os, sys, hashlib, json
socket.setdefaulttimeout(25)
import urllib.request

OUT = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"}

PAGES = {
    "4755": ("https://www.retouch.my/product/m073mg", "M073MG"),
    "4913": ("https://www.retouch.my/product/m061mg", "M061MG"),
    "5342": ("https://hardexworld.com/product/he4251/", "HE4251"),
    "5343": ("https://hardexworld.com/product/he4252/", "HE4252"),
}

def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req) as r:
            return r.geturl(), r.status, r.read()
    except Exception as e:
        return None, str(e), b""

results = {}
for pos, (url, model) in PAGES.items():
    final, status, body = fetch(url)
    if body:
        html = body.decode("utf-8", "replace")
        title = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        h1s = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.S | re.I)
        og = re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I)
        og2 = re.findall(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.I)
        norm = re.sub(r"<[^>]+>", " ", html)
        norm = re.sub(r"\s+", " ", norm).upper()
        has_model = model.upper() in norm
        # gallery/product imgs
        imgs = re.findall(r'<img[^>]+(?:data-large_image|data-src|src)=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)', html, re.I)
        results[pos] = {"url": url, "final_url": final, "status": str(status), "bytes": len(body),
                        "title": title.group(1).strip()[:200] if title else None,
                        "h1": [re.sub(r"<[^>]+>", "", h).strip()[:120] for h in h1s][:4],
                        "og_image": og + og2,
                        "model_in_text": has_model,
                        "img_candidates": list(dict.fromkeys(imgs))[:12]}
        with open(os.path.join(OUT, f"page-{pos}.html"), "w", encoding="utf-8") as f:
            f.write(html)
    else:
        results[pos] = {"url": url, "error": status}

print(json.dumps(results, indent=1))
