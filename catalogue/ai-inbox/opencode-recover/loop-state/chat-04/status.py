import csv
import glob
import os

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
tot = {'candidate': 0, 'exhausted': 0, 'open': 0}
cands = []
for f in sorted(glob.glob(CHAT + r'\shard-r1-batch-*.csv')):
    b = os.path.basename(f).split('batch-')[1].split('.')[0]
    try:
        rows = list(csv.DictReader(open(f, encoding='utf-8')))
    except Exception as e:
        print('READ FAIL', f, e)
        continue
    c = sum(1 for r in rows if r['state'] == 'candidate')
    e = sum(1 for r in rows if r['state'] == 'exhausted')
    o = sum(1 for r in rows if r['state'] == 'open')
    tot['candidate'] += c; tot['exhausted'] += e; tot['open'] += o
    print('batch-%s rows=%d cand=%d exh=%d open=%d' % (b, len(rows), c, e, o))
    for r in rows:
        if r['state'] == 'candidate':
            cands.append((r['source_position'], r['item_code'], r['official_image_url']))
print('TOTALS', tot)
print('CANDIDATES:')
for p, ic, u in cands:
    v = ''
    vf = glob.glob(CHAT + r'\verify-r1-*.csv')
    for g in vf:
        for vr in csv.DictReader(open(g, encoding='utf-8')):
            if vr['source_position'] == p:
                v = vr['verifier_verdict']
    print(p, ic, 'verified=' + (v or 'PENDING'), u[:110])
ev = sorted(glob.glob(CHAT + r'\evidence-r1-*.json'))
print('evidence files:', len(ev))
vf = sorted(glob.glob(CHAT + r'\verify-r1-*.csv'))
print('verify files:', [os.path.basename(x) for x in vf])
