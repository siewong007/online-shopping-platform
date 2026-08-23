import csv
import glob
import json
import os
import shutil
import subprocess
import sys

BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover'
CHAT = BASE + r'\loop-state\chat-04'
GR = CHAT + r'\gate-run'
PC = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\pagecache'

LEDGER_HEADER = ["source_position", "item_code", "uom", "display_name", "category",
                 "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
                 "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
                 "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
                 "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
                 "machine_gate", "reason", "human_action"]

# --- model-string enrichment (quoted from opened pages, verified independently) ---
enrich = {
    '5116': 'Swallow Abrasive Sand Paper 60#',
    '5158': 'Swallow Abrasive Sand Paper 80',
    '5468': 'Swallow Abrasive Sand Paper 120',
    '5501': 'Swallow Abrasive Sand Paper 100',
    '6243': 'Energizer Lithium 2032',
    '6358': 'Energizer Lithium 2016',
    '6488': 'Energizer Lithium 2025',
    '4922': 'Energizer MAX AAA 2',
    '5925': 'Energizer MAX AA 8',
    '6008': 'Energizer MAX AAA 8',
    '6489': 'Energizer MAX 9V',
}

# base ledger
assign = list(csv.DictReader(open(BASE + r'\loop-state\chat-assignments\chat-04.csv', encoding='utf-8')))
ledger = {}
for r in assign:
    row = {k: '' for k in LEDGER_HEADER}
    row.update({'source_position': r['source_position'], 'item_code': r['item_code'], 'uom': r['uom'],
                'display_name': r['display_name'], 'category': r['category'],
                'detected_brand': r['detected_brand'], 'detected_model': r['detected_model'],
                'state': 'open', 'round_first_seen': '1', 'round_last_touched': '0'})
    ledger[r['source_position']] = row

for f in sorted(glob.glob(CHAT + r'\shard-r1-batch-*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        p = r['source_position']
        if p in ledger:
            ledger[p].update({k: (r.get(k) or '') for k in LEDGER_HEADER})

# verifier overlay
for f in sorted(glob.glob(CHAT + r'\verify-r1-*.csv')):
    for v in csv.DictReader(open(f, encoding='utf-8')):
        p = v['source_position']
        if p in ledger and ledger[p]['state'] == 'candidate':
            ledger[p]['verifier_verdict'] = v['verifier_verdict']

# enrichment on candidates
n = 0
for p, dm in enrich.items():
    row = ledger.get(p)
    if row and row['state'] == 'candidate':
        row['detected_model'] = dm
        if 'model_string_quoted_from_page' not in row['reason']:
            row['reason'] += ' | model_string_quoted_from_page: "' + dm + '" (matches opened page text)'
        n += 1
print('enriched:', n)

rows_out = sorted(ledger.values(), key=lambda x: int(x['source_position']))
with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows_out)

# evidence copies
ne = 0
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    shutil.copyfile(f, GR + '\\' + os.path.basename(f)); ne += 1
print('evidence copied:', ne)

# pagecache: copy for every position mentioned anywhere (evidence or shards)
touched = set()
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    touched |= set(json.load(open(f, encoding='utf-8')).keys())
for f in glob.glob(CHAT + r'\shard-r1-batch-*.csv'):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        if r['state'] == 'candidate':
            touched.add(r['source_position'])
cop = miss = 0
missing_list = []
for p in sorted(touched, key=int):
    src = PC + '\\' + str(p) + '.txt'
    dst = GR + r'\pagecache' + '\\' + str(p) + '.txt'
    if os.path.exists(src):
        shutil.copyfile(src, dst); cop += 1
    else:
        miss += 1; missing_list.append(p)
print('pagecache copied:', cop, 'missing:', miss, missing_list[:25])

# local collision pre-check
from collections import defaultdict
sha_map = defaultdict(list); url_map = defaultdict(list)
for pos, r in ledger.items():
    if r['state'] in ('candidate', 'verified_pass'):
        if r['image_sha256']:
            sha_map[r['image_sha256']].append(pos)
        if r['official_image_url']:
            url_map[r['official_image_url'].split('?')[0]].append(pos)
print('sha collisions:', {s: ps for s, ps in sha_map.items() if len(ps) > 1})
print('url collisions:', {u: ps for u, ps in url_map.items() if len(ps) > 1})

# run gate
res = subprocess.run([sys.executable, GR + r'\gate.py', '--round', '0'], capture_output=True, text=True)
print(res.stdout[-3000:])
if res.returncode != 0:
    print('GATE ERR', res.stderr[-2000:])
