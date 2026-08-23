import glob, os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "serp-I2")
for fp in sorted(glob.glob(os.path.join(OUT, "*.txt"))):
    jid = os.path.basename(fp)[:-4]
    lines = [l for l in open(fp, encoding="utf-8").read().splitlines() if l.strip()]
    print("### " + jid)
    for l in lines[:6]:
        print("  " + l[:200])
