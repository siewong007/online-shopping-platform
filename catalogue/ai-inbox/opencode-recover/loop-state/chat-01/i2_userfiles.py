import re, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def sections(fp, codes):
    h = open(fp, encoding="utf-8").read()
    print("==", fp.split("/")[-1])
    # find all userfile images with nearby text
    imgs = [(m.start(), m.group(1)) for m in re.finditer(r'(https://cdn1\.npcdn\.net/userfiles/[^"\s]+)', h)]
    print("userfiles imgs:", len(imgs))
    for pos, u in imgs[:20]:
        ctx_txt = re.sub(r"<[^>]+>", "|", h[pos:pos+400])
        ctx_txt = re.sub(r"\s+", " ", ctx_txt)[:120]
        back = re.sub(r"<[^>]+>", "|", h[max(0, pos-600):pos])
        back = re.sub(r"\s+", " ", back)[-150:]
        print("  IMG:", u[-60:], "| AFTER:", ctx_txt, "| BEFORE:", back)
    for c in codes:
        i = h.find(c)
        if i == -1:
            print("  ", c, "-> none"); continue
        seg = h[i:i+2500]
        us = re.findall(r'(https://cdn1\.npcdn\.net/userfiles/[^"\s]+)', seg)
        print("  ", c, "-> imgs after:", [u.split("/")[-1][:40] for u in us[:4]])

sections("catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-eleg-blk-dp.html", ["E20AB"])
sections("catalogue/ai-inbox/opencode-recover/loop-state/chat-01/serp-I2/retouch-ultra-white-13a-sockets.html", ["M08913W"])
