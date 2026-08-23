#!/usr/bin/env python3
"""ESC-2 batch Bing queries. Usage: esc2_batch.py q1 q2 ... (URL-encoded ok)"""
import sys, time, subprocess, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
HERE = r"catalogue\ai-inbox\opencode-recover\loop-state\chat-01"
for i, q in enumerate(sys.argv[1:]):
    print("=" * 20, f"batch {i+1}/{len(sys.argv)-1}")
    r = subprocess.run([sys.executable, HERE + r"\esc2_bingq.py", q],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = (r.stdout or "") + (r.stderr or "")
    lines = out.splitlines()
    # keep header + first 7 result lines per query to bound output
    keep = []
    shown = 0
    for ln in lines:
        if ln.startswith("Q:") or ln.startswith("  NO"):
            keep.append(ln)
        elif ln.strip().startswith("[") and shown < 7:
            keep.append(ln)
            shown += 1
        elif ln.strip().startswith("http") and shown <= 7:
            keep.append("    " + ln.strip()[:160])
    print("\n".join(keep))
    time.sleep(3)
