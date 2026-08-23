import csv
import glob
import json
import os
import shutil

BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover'
CHAT = BASE + r'\loop-state\chat-04'
GR = CHAT + r'\gate-run'
AI = BASE + r'\..'

LEDGER_HEADER = ["source_position", "item_code", "uom", "display_name", "category",
                 "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
                 "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
                 "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
                 "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
                 "machine_gate", "reason", "human_action"]

# 1) base ledger from assignment (all open)
assign = list(csv.DictReader(open(BASE + r'\loop-state\chat-assignments\chat-04.csv', encoding='utf-8')))
ledger = {}
for r in assign:
    row = {k: '' for k in LEDGER_HEADER}
    row.update({
        'source_position': r['source_position'], 'item_code': r['item_code'], 'uom': r['uom'],
        'display_name': r['display_name'], 'category': r['category'],
        'detected_brand': r['detected_brand'], 'detected_model': r['detected_model'],
        'state': 'open', 'round_first_seen': '1', 'round_last_touched': '0',
    })
    ledger[r['source_position']] = row

# 2) overlay shard data
for f in sorted(glob.glob(CHAT + r'\shard-r1-batch-*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8')):
        if r['source_position'] not in ledger:
            print('WARN unknown position', r['source_position'])
            continue
        ledger[r['source_position']].update({k: (r.get(k) or '') for k in LEDGER_HEADER})

# 3) overlay verifier verdicts onto candidates
for f in sorted(glob.glob(CHAT + r'\verify-r1-*.csv')):
    for v in csv.DictReader(open(f, encoding='utf-8')):
        p = v['source_position']
        if p in ledger and ledger[p]['state'] == 'candidate':
            ledger[p]['verifier_verdict'] = v['verifier_verdict']

rows_out = sorted(ledger.values(), key=lambda x: int(x['source_position']))
with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader()
    w.writerows(rows_out)
print('ledger rows:', len(rows_out))

# 4) evidence copies
n = 0
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    shutil.copyfile(f, GR + '\\' + os.path.basename(f))
    n += 1
print('evidence copied:', n)

# 5) pagecache for touched positions
touched = set()
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    touched |= set(json.load(open(f, encoding='utf-8')).keys())
pc_src = BASE.replace('opencode-recover', '') + r'pagecache'
pc_src = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\pagecache'
cop = miss = 0
for p in touched:
    src = pc_src + '\\' + str(p) + '.txt'
    dst = GR + r'\pagecache\\' + str(p) + '.txt'
    if os.path.exists(src):
        shutil.copyfile(src, dst); cop += 1
    else:
        miss += 1
print('pagecache copied:', cop, 'missing:', miss)

# 6) hashes.csv deliverable
seen = {}
for f in sorted(glob.glob(CHAT + r'\evidence-r1-*.json')):
    b = os.path.basename(f).split('batch-')[1].split('.')[0]
    shard = CHAT + r'\shard-r1-batch-' + b + '.csv'
    smap = {}
    if os.path.exists(shard):
        for r in csv.DictReader(open(shard, encoding='utf-8')):
            smap[r['source_position']] = r
    for pos, e in json.load(open(f, encoding='utf-8')).items():
        sha = e.get('image_sha256') or ''
        if not sha or pos in seen:
            continue
        ic = smap.get(pos, {}).get('item_code', '')
        uom = smap.get(pos, {}).get('uom', '')
        seen[pos] = [pos, ic, uom, e.get('image_final_url', ''), sha,
                     e.get('px_w', 0), e.get('px_h', 0), e.get('image_bytes_len', 0)]
with open(CHAT + r'\hashes.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['source_position', 'item_code', 'uom', 'official_image_url', 'image_sha256', 'image_px_w', 'image_px_h', 'image_bytes'])
    for k in sorted(seen, key=int):
        w.writerow(seen[k])
print('hashes.csv entries:', len(seen))

# 7) local collision pre-check across candidates
from collections import defaultdict
sha_map = defaultdict(list)
for pos, r in ledger.items():
    if r['state'] in ('candidate', 'verified_pass') and r['image_sha256']:
        sha_map[r['image_sha256']].append(pos)
bad = {s: ps for s, ps in sha_map.items() if len(ps) > 1}
url_map = defaultdict(list)
for pos, r in ledger.items():
    if r['state'] in ('candidate', 'verified_pass') and r['official_image_url']:
        url_map[r['official_image_url'].split('?')[0]].append(pos)
badu = {u: ps for u, ps in url_map.items() if len(ps) > 1}
print('sha collisions:', bad)
print('url collisions:', badu)
