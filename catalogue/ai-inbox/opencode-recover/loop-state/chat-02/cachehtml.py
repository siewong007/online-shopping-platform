import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetchlib as F

def cache_from_html(pos, path):
    t = open(path, encoding="utf-8", errors="ignore").read()
    txt = F.html_to_text(t.encode("utf-8"))
    with open(os.path.join(F.PAGECACHE, f"{pos}.txt"), "w", encoding="utf-8") as fh:
        fh.write(txt)
    nt = F.norm_text(txt)
    return len(txt), nt

if __name__ == "__main__":
    pos, path = sys.argv[1], sys.argv[2]
    n, nt = cache_from_html(pos, path)
    print("cached", pos, "textlen", n)
    for probe in sys.argv[3:]:
        print(probe, "->", F.norm_text(probe) in nt)
