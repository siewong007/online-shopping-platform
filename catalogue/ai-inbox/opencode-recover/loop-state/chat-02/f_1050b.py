import sys, socket, re, os
socket.setdefaulttimeout(25)
sys.path.insert(0, r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
import fetchlib as F

def model_variants_safe(detected_model, item_code):
    """Copy of fetchlib.model_variants with hashable dedup keys."""
    out = []
    dm = (detected_model or "").strip()
    ic = (item_code or "").strip()
    if dm:
        n = F.norm_text(dm)
        if len(n) >= 3:
            out.append(n)
            toks = [F.norm_text(t) for t in re.split(r"[^0-9A-Za-z]+", dm) if F.norm_text(t)]
            longtoks = [t for t in toks if len(t) >= 4]
            if longtoks:
                out.append(("TOKENS:", longtoks))
    parts = ic.split("-")
    if len(parts) > 1:
        tail = "".join(parts[1:])
        n = F.norm_text(tail)
        if len(n) >= 4:
            out.append(n)
        segs = [F.norm_text(s) for s in parts[1:] if F.norm_text(s)]
        for i in range(len(segs)):
            acc = ""
            for j in range(i, len(segs)):
                acc += segs[j]
                if len(acc) >= 5 and any(c.isdigit() for c in acc):
                    out.append(acc)
    seen, uniq = set(), []
    for v in out:
        key = repr(v) if isinstance(v, tuple) else v
        if key not in seen:
            seen.add(key); uniq.append(v)
    return uniq

def safe_precheck(pos, detected_model, item_code):
    p = os.path.join(F.PAGECACHE, f"{pos}.txt")
    if not os.path.exists(p):
        return False
    nt = F.norm_text(open(p, encoding="utf-8", errors="ignore").read())
    if not nt:
        return False
    for v in model_variants_safe(detected_model, item_code):
        if isinstance(v, tuple):
            toks = [t for t in v[1] if t]
            if toks and all(t in nt for t in toks):
                return True
        elif len(v) >= 4 and v in nt:
            return True
    return False

if __name__ == "__main__":
    print("variants:", model_variants_safe("B136-40CC", "SPRA-BOSNY-B136-400CC"))
    print("bosny precheck:", safe_precheck(3508, "B136-40CC", "SPRA-BOSNY-B136-400CC"))
    txt = open(os.path.join(F.PAGECACHE, "3508.txt"), encoding="utf-8", errors="ignore").read()
    i = txt.upper().find("B136")
    print("ctx:", txt[max(0,i-150):i+200].replace("\n"," "))
