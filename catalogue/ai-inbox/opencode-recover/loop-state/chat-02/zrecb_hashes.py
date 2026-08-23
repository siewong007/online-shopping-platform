import csv, os
from collections import defaultdict
base = os.path.dirname(os.path.abspath(__file__))
pos = {'4306','4330','3622','4669','2582','6437','4755','4913','2682','2795'}
rows = []
with open(os.path.join(base,'hashes.csv'), encoding='utf-8-sig', newline='') as fh:
    rd = csv.DictReader(fh)
    cols = rd.fieldnames
    print('COLS:', cols)
    for r in rd:
        rows.append(r)
mine = [r for r in rows if r.get('source_position') in pos]
print('--- my hash rows ---')
for r in mine:
    print(r['source_position'], r['official_image_url'][:110], r['image_sha256'][:16], r['image_px_w'], r['image_px_h'], r['image_bytes'])
print('--- sha collisions across all rows ---')
bysha = defaultdict(list)
for r in rows:
    sha = r.get('image_sha256') or ''
    if sha:
        bysha[sha].append((r.get('source_position'), r.get('item_code'), r.get('uom')))
for sha, lst in bysha.items():
    keys = {(a,b,c) for a,b,c in lst}
    if len(keys) > 1:
        print('SHARED', sha[:16], sorted(keys))
