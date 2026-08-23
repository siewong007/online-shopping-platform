import csv, os, json, sys, subprocess
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")

# remap old->new rebuilt from shard truth vs brief (same join as repair_positions)
brief = list(csv.DictReader(open(os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\chat-02.csv'), encoding='utf-8-sig')))
bykey = {}
for r in brief:
    bykey[(r['item_code'], r['uom'])] = r['source_position']
pos2row = {}
for r in brief:
    pos2row[r['source_position']] = r

remap = {}
for fn in sorted(f for f in os.listdir(CH) if f.startswith('shard-') and f.endswith('.csv')):
    for r in csv.DictReader(open(os.path.join(CH, fn), encoding='utf-8')):
        if not r.get('source_position'):
            continue
        t = bykey.get((r['item_code'], r['uom']))
        if t and r['source_position'] != t:
            remap[r['source_position']] = t
print('remap size', len(remap))

# apply to verifier outputs
for vf in ['verify-single-918-r2.csv', 'verify-batch-a.csv', 'verify-batch-b.csv',
           'verify-batch-c.csv', 'verify-batch-d.csv']:
    p = os.path.join(CH, vf)
    if not os.path.exists(p):
        continue
    rows = list(csv.reader(open(p, encoding='utf-8')))
    hdr = rows[0]
    ip = hdr.index('source_position')
    ch = False
    for r in rows[1:]:
        if len(r) == len(hdr) and r[ip] in remap:
            r[ip] = remap[r[ip]]
            ch = True
    if ch:
        csv.writer(open(p, 'w', encoding='utf-8', newline='')).writerows(rows)
        print('remapped', vf)

# identify brief rows for suspicious positions
for p in ['3070', '3212', '6437', '3508', '5771', '2582', '4448', '2807', '3694', '3729', '4177', '4762', '4781', '1040']:
    b = pos2row.get(p)
    print('pos', p, '->', (b['ordinal'], b['item_code'], b['display_name'][:34]) if b else 'NOT IN MY BLOCK')

# reassemble ledger with corrected keys + verifier results
res = subprocess.run([sys.executable, os.path.join(CH, 'assemble_ledger.py')],
                     capture_output=True, text=True, timeout=100)
print(res.stdout[-500:])

# current candidates
led = list(csv.DictReader(open(os.path.join(CH, 'chat-02-ledger.csv'), encoding='utf-8')))
for r in led:
    if r['state'] == 'candidate':
        print('CAND', r['source_position'], r['item_code'], r['verifier_verdict'] or 'unverified')

import datetime
cl = os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\claims')
now = datetime.datetime.utcnow().isoformat() + 'Z'
for i in range(18, 35):
    open(os.path.join(cl, 'S%04d.claim' % i), 'w').write('chat=02,utc=%s,status=working\n' % now)
print('hb ok')
