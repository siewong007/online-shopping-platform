import re, sys, urllib.request
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"}

def get(url, timeout=15):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read().decode("utf-8", "ignore")

if __name__ == "__main__":
    url = sys.argv[1]
    pat = sys.argv[2] if len(sys.argv) > 2 else r'href="([^"]+)"'
    raw = get(url)
    hits = sorted(set(re.findall(pat, raw)))
    print("TOTAL", len(hits))
    for h in hits:
        print(h)
