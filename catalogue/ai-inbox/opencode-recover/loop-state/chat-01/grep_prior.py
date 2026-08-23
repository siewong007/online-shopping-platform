import csv
path = r"catalogue\ai-inbox\opencode-recover\loop-state\round-01\shard-0101-0200.csv"
rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
for r in rows[:6]:
    print(r["source_position"], "|", r["item_code"], "|", r["researcher_decision"])
print("...")
import collections
pos = [int(r["source_position"]) for r in rows]
print("pos range", min(pos), max(pos))
