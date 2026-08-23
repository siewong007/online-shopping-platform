import csv, hashlib

BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state"
HASHES = BASE + r"\chat-01\hashes.csv"

# pos -> (item_code, uom, url, local_file, px_w, px_h)
CAND = [
    ("4217", "SWI-SOC-ULT-M08213MG", "PCS", "https://cdn1.npcdn.net/userfiles/27047/file/MG.png",
     r"C:\Users\DELL\AppData\Local\Temp\opencode\j2img\MG_2g_13A_mg.png", 2946, 1854),
    ("4331", "SWI-SOC-ULT-M08213W", "PCS", "https://cdn1.npcdn.net/userfiles/27047/file/URW8.png",
     r"C:\Users\DELL\AppData\Local\Temp\opencode\j2img\URW8_2g_13A_w.png", 2898, 1827),
    ("4810", "SWI-SOC-ULT-M022W", "PCS", "https://cdn1.npcdn.net/userfiles/27047/file/URW44.png",
     r"C:\Users\DELL\AppData\Local\Temp\opencode\j2img\URW44_2g2w_w.png", 2585, 2558),
    ("5085", "SWI-SOC-ULT-M012W", "PCS", "https://cdn1.npcdn.net/userfiles/27047/file/URW22.png",
     r"C:\Users\DELL\AppData\Local\Temp\opencode\j2img\URW22_1g2w_w.png", 2349, 2330),
    ("3549", "TOO-FIL-BCC-4.0200MM", "PCS", "https://pimdatacdn.bahco.com/media/sub444/169ff3ff500da23f.png",
     r"C:\Users\DELL\AppData\Local\Temp\opencode\bahco_b.png", 2048, 1026),
]

existing_urls = set()
existing_shas = set()
with open(HASHES, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        existing_urls.add(r["official_image_url"])
        existing_shas.add(r["image_sha256"])

new_rows = []
for pos, code, uom, url, path, w, h in CAND:
    data = open(path, "rb").read()
    assert len(data) >= 20 * 1024, f"{pos} too small"
    assert max(w, h) >= 500
    sha = hashlib.sha256(data).hexdigest()
    dup = url in existing_urls or sha in existing_shas
    print(pos, code, len(data), "B", sha[:16], "DUPLICATE!" if dup else "unique")
    assert not dup
    existing_urls.add(url); existing_shas.add(sha)
    new_rows.append([pos, code, uom, url, sha, w, h, len(data)])

with open(HASHES, "a", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    for r in new_rows:
        w.writerow(r)
print("appended", len(new_rows), "rows ->", HASHES)
