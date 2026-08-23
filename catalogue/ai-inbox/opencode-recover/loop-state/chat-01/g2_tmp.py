#!/usr/bin/env python3
import json

ev = json.load(open(r"catalogue/ai-inbox/opencode-recover/loop-state/chat-01/evidence-G2.json",
                    encoding="utf-8"))
for pos, e in sorted(ev.items()):
    print(pos, "| page", e.get("page_status"), e.get("page_final_url", "")[:70],
          "| img", e.get("image_status"), e.get("image_final_url", "")[:80],
          "| ct", e.get("image_content_type"), "| px", e.get("px_w"), "x", e.get("px_h"),
          "| bytes", e.get("image_bytes_len"), "| sha", e.get("image_sha256", "")[:16])
