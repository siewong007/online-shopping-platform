import csv
import glob
import os

CHAT = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover\loop-state\chat-04'
GR = CHAT + r'\gate-run'

print('verify files on disk:')
for f in sorted(glob.glob(CHAT + r'\verify-r1-*.csv')):
    rr = list(csv.DictReader(open(f, encoding='utf-8-sig')))
    print(' ', os.path.basename(f), [x['source_position'] for x in rr])

rows = {r['source_position']: r for r in csv.DictReader(open(GR + r'\loop-ledger.csv', encoding='utf-8'))}
for p in ['2933', '3401', '4552', '6796', '4287']:
    r = rows.get(p)
    if r:
        print(p, '| state=', r['state'], '| vv=', repr(r['verifier_verdict']), '| me=', repr(r['model_exact']), '| fe=', repr(r['finish_exact']))
    else:
        print(p, 'MISSING from GR ledger')
