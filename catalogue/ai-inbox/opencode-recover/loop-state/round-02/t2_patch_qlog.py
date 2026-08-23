import csv
from collections import Counter

P = r"catalogue/ai-inbox/opencode-recover/loop-state/round-02/shard-t2.csv"
rows = list(csv.DictReader(open(P, encoding="utf-8")))
flds = list(rows[0].keys())

Q = {
    "1": "q:joven sl30ip-rs black rainshower",
    "3": "q:joven sl30ip white",
    "11": "q:joven sl30e-rs",
    "18": "q:joven sb11ip-rs 4.2kw black",
    "26": "q:joven sb11ip white",
    "120": "q:bosch gsb 13 re 06012271L2 malaysia",
    "184": "q:bosch gbh 185-li 06119240L1",
    "195": 'q:bosch "2608522405" OR "2608522407" impact control bit',
    "208": "q:bosch gol 26 d 0601068000",
    "226": "q:bosch gsh 5mx 06113389L1 malaysia",
    "252": "q:bosch easyaquatak 110 06008A7FL0",
}
for r in rows:
    if r["source_position"] in Q and "q:" not in r["reason"]:
        r["reason"] = Q[r["source_position"]] + " | " + r["reason"]

with open(P, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, flds)
    w.writeheader()
    w.writerows(rows)

print("FINAL", dict(Counter(r["researcher_decision"] for r in rows)), "rows", len(rows))
print("q-log complete:", all("q:" in r["reason"] for r in rows))
