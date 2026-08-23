import os
from PIL import Image

outdir = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04\verify-tmp"

# convert webp -> png for viewing
im = Image.open(os.path.join(outdir, "5468.webp")).convert("RGB")
im.save(os.path.join(outdir, "5468.png"))

# make 2x upscaled full copies for detail inspection
for pos in ["5116", "5158", "5468", "5501"]:
    src = None
    for ext in ["jpg", "png", "webp"]:
        p = os.path.join(outdir, "%s.%s" % (pos, ext))
        if os.path.exists(p):
            src = p
            break
    im = Image.open(src).convert("RGB")
    w, h = im.size
    im.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join(outdir, "%s_2x.png" % pos))
    print(pos, src, im.size)
