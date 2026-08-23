import csv
import glob
import json
import os

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
GR = CHAT + r'\gate-run'

rep = json.load(open(GR + r'\gate-report.json', encoding='utf-8'))
print('reds_by_code:', rep['reds_by_code'])
for r in rep['reds'][:24]:
    print(r['code'], '|', r['key'], '|', r['detail'][:160])

rows = {r['source_position']: r for r in csv.DictReader(open(GR + r'\loop-ledger.csv', encoding='utf-8'))}
cands = [(p, r['item_code'], r['verifier_verdict']) for p, r in rows.items() if r['state'] == 'candidate']
print('candidates awaiting:', cands)

# duplicate item_code+uom inside block
from collections import Counter
cnt = Counter((r['item_code'], r['uom']) for r in rows.values())
dups = {k: [p for p, r in rows.items() if (r['item_code'], r['uom']) == k] for k, n in cnt.items() if n > 1}
print('in-block dup keys:', len(dups))
for k, ps in list(dups.items())[:12]:
    acts = [rows[p]['action'] if 'action' in rows[p] else '' for p in ps]
    print(k, ps)
