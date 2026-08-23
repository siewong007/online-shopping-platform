"""chat-02 shard-960-989 helper: fetch raw HTML/PDF bytes, list image URL candidates."""
import sys, re, socket
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
from fetchlib import _open


def imgs(url, pat=None, save=None):
    try:
        r = _open(url)
        raw = r.read(4_000_000).decode("utf-8", "ignore")
    except Exception as e:
        print("FETCHFAIL", repr(e)[:120])
        return []
    if save:
        open(save, "w", encoding="utf-8").write(raw)
    cands = set()
    for m in re.findall(r'<img[^>]+>', raw):
        src = re.search(r'(?:data-src|data-lazy-src|src)="([^"]+)"', m)
        if not src:
            continue
        u = src.group(1)
        if u.startswith("//"):
            u = "https:" + u
        if not u.startswith("http"):
            continue
        if re.search(r'\.(jpg|jpeg|png|webp)(\?|$)', u, re.I) and not re.search(r'logo|icon|placeholder|banner|slider|payment', u, re.I):
            if pat is None or re.search(pat, u, re.I):
                cands.add(u)
    for m in re.findall(r'"(?:og:image|product)"[^>]*content="([^"]+)"', raw):
        cands.add(m)
    out = sorted(cands)[:25]
    for u in out:
        print(u[:220])
    return out


def rawurls(url):
    try:
        raw = _open(url).read(4_000_000).decode("utf-8", "ignore")
    except Exception as e:
        print("FETCHFAIL", repr(e)[:120])
        return []
    out = sorted(set(re.findall(r'[^\s"\']+\.(?:jpg|jpeg|png|webp)[^\s"\']*', raw, re.I)))
    for u in out[:40]:
        print(u[:220])
    return out


if __name__ == "__main__":
    pat = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "-" else None
    if pat == "-":
        rawurls(sys.argv[1])
    else:
        imgs(sys.argv[1], pat)
