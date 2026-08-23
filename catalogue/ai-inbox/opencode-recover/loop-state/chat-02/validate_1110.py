import sys, os, json, csv
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover"
LS = os.path.join(BASE, "loop-state")
sys.path.insert(0, LS)
import gate as G  # frozen gate module (import only)

shard = os.path.join(LS, "chat-02", "shard-1110-1139.csv")
rows = list(csv.DictReader(open(shard, encoding="utf-8")))
print("rows:", len(rows), "| header ok:", list(rows[0].keys()) == G.LEDGER_HEADER)

ev = {}
data = json.load(open(os.path.join(LS, "chat-02", "evidence.json"), encoding="utf-8"))
ev.update(data)

ok = True
for r in rows:
    pos = r["source_position"]
    if r["state"] == "candidate":
        txt_p = os.path.join(BASE, "pagecache", pos + ".txt")
        text = open(txt_p, encoding="utf-8", errors="ignore").read() if os.path.exists(txt_p) else ""
        mp = G.model_present(r, text)
        e = ev.get(pos, {})
        e_page = e.get("page_status")
        e_img = e.get("image_status")
        ct = (e.get("image_content_type") or "")
        le = max(int(e.get("px_w") or 0), int(e.get("px_h") or 0))
        blen = int(e.get("image_bytes_len") or 0)
        bad_hosts = any(h in (r["official_image_url"] + r["official_product_page"]).lower()
                        for h in G.MARKETPLACE_HOSTS)
        hints = any(h in r["official_image_url"].lower() for h in ("/search", "?s=", "?q=", "/404"))
        print(f"{pos}: model_present={mp} page={e_page} img={e_img} ct={ct} long_edge={le} bytes={blen} "
              f"mkt_host={bad_hosts} redir_hint={hints} rights={r['rights_status']} "
              f"model_exact={r['model_exact']} finish_exact={r['finish_exact']}")
        ok &= mp and e_page == 200 and e_img == 200 and ct.startswith("image/") and le >= 500 and blen >= 20000 \
              and not bad_hosts and not hints and r["rights_status"] in ("needs_permission", "unknown", "no_asset")

# schema-ish sweeps on whole shard
for r in rows:
    st = r["state"]
    reason = r["reason"] or ""
    if st != "open":
        assert reason.strip(), f"{r['source_position']}: empty reason"
        assert "q:" in reason or "action=skip_pass" in reason.split("|")[0], f"{r['source_position']}: no q:"
        assert len(reason) > 80, f"{r['source_position']}: thin reason"
    assert st in ("candidate", "open", "exhausted"), st
    if st == "exhausted":
        assert r["human_action"].strip(), f"{r['source_position']}: exhausted without human_action"
        assert r["researcher_decision"] == "exhausted"
    if st == "candidate":
        assert not r["verifier_verdict"] and not r["machine_gate"]
print("schema sweep ok:", True)

# ---- family-hero check across ALL of chat-02 hashes.csv ----
claims_url, claims_sha = {}, {}
for h in csv.DictReader(open(os.path.join(LS, "chat-02", "hashes.csv"), encoding="utf-8")):
    key_item = (h["item_code"] or "").strip()
    url = (h["official_image_url"] or "").strip()
    sha = (h["image_sha256"] or "").strip()
    if url:
        claims_url.setdefault(url, set()).add(key_item or "#" + h["source_position"])
    if sha:
        claims_sha.setdefault(sha, set()).add(key_item or "#" + h["source_position"])

my_positions = {r["source_position"] for r in rows}
collisions = []
for url, items in claims_url.items():
    diff = {i for i in items if i}
    if len(diff) > 1:
        collisions.append(("URL", url[:90], diff))
for sha, items in claims_sha.items():
    if len(items) > 1:
        collisions.append(("SHA", sha[:16], items))
print("family-hero collisions in chat-02 hashes.csv:", len(collisions))
for c in collisions[:10]:
    print("  ", c)
print("FINAL candidate gate-sim ok:", bool(ok) and not collisions)
