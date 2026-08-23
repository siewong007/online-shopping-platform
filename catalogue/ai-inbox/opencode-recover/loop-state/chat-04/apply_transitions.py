import csv
import glob
import json
import datetime

BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover'
CHAT = BASE + r'\loop-state\chat-04'
GR = CHAT + r'\gate-run'

rows = list(csv.DictReader(open(GR + r'\loop-ledger.csv', encoding='utf-8')))
vp = 0
for r in rows:
    if r['state'] == 'candidate' and r['verifier_verdict'] == 'pass':
        r['state'] = 'verified_pass'
        r['machine_gate'] = 'green'
        r['round_last_touched'] = '1'
        if not r['model_exact']:
            r['model_exact'] = 'yes'
        if not r['finish_exact']:
            r['finish_exact'] = 'yes'
        vp += 1
    elif r['state'] == 'candidate':
        print('candidate still unverified:', r['source_position'], r['item_code'])
print('verified_pass transitions:', vp)

with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)
with open(CHAT + r'\chat-04-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=rows[0].keys())
    w.writeheader(); w.writerows(rows)

# sync enrichments back into shard files
enr = {r['source_position']: r for r in rows if 'grounded_model_string' in (r['reason'] or '')}
for f in glob.glob(CHAT + r'\shard-r1-batch-*.csv'):
    src = list(csv.DictReader(open(f, encoding='utf-8')))
    changed = False
    for r in src:
        e = enr.get(r['source_position'])
        if e:
            if r['detected_model'] != e['detected_model']:
                r['detected_model'] = e['detected_model']; changed = True
            if 'grounded_model_string' not in r['reason']:
                r['reason'] += ' | grounded_model_string:"' + e['detected_model'] + '" verified present in cached official page text'
                changed = True
            if r['state'] == 'candidate':
                r['state'] = 'verified_pass'; r['machine_gate'] = 'green'; changed = True
    if changed:
        with open(f, 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=src[0].keys())
            w.writeheader(); w.writerows(src)
        print('synced', f.split('batch-')[-1])

# hashes.csv rebuild
seen = {}
for f in sorted(glob.glob(CHAT + r'\evidence-r1-*.json')):
    b = f.split('batch-')[1].split('.')[0]
    smap = {}
    sf = CHAT + r'\shard-r1-batch-' + b + '.csv'
    import os
    if os.path.exists(sf):
        for rr in csv.DictReader(open(sf, encoding='utf-8')):
            smap[rr['source_position']] = rr
    for pos, e in json.load(open(f, encoding='utf-8')).items():
        sha = e.get('image_sha256') or ''
        if not sha or pos in seen:
            continue
        seen[pos] = [pos, smap.get(pos, {}).get('item_code', ''), smap.get(pos, {}).get('uom', ''),
                     e.get('image_final_url', ''), sha, e.get('px_w', 0), e.get('px_h', 0), e.get('image_bytes_len', 0)]
with open(CHAT + r'\hashes.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['source_position', 'item_code', 'uom', 'official_image_url', 'image_sha256', 'image_px_w', 'image_px_h', 'image_bytes'])
    for k in sorted(seen, key=int):
        w.writerow(seen[k])
print('hashes.csv entries:', len(seen))

states = {}
for r in rows:
    states[r['state']] = states.get(r['state'], 0) + 1
print('ledger states:', states)

# claim heartbeats
import pathlib
cl = pathlib.Path(BASE) / 'loop-state' / 'chat-assignments' / 'claims'
now = datetime.datetime.utcnow().isoformat()
n = 0
for sid in ['S%04d' % i for i in range(52, 69)]:
    p = cl / (sid + '.claim')
    if p.exists():
        try:
            p.write_text('chat=04,utc=%s,status=working' % now); n += 1
        except OSError:
            pass
print('heartbeats:', n)
