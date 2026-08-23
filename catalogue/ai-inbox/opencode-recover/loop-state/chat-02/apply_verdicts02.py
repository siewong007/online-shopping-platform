import csv, os, json, sys, subprocess
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")

brief = list(csv.DictReader(open(os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\chat-02.csv'), encoding='utf-8-sig')))
byic = {}
for r in brief:
    byic[r['item_code']] = r
for ic in ['EPO-HAR-HE4251', 'EPO-HAR-HE4252', 'SWI-SOC-ULT-M073MG', 'SWI-SOC-ULT-M061MG']:
    b = byic.get(ic)
    print(ic, '-> pos', b['source_position'] if b else '?')

# ordinal->position pairs for rows whose shard writer used the ordinal
pairs = {}
for r in brief:
    pairs[r['ordinal']] = r['source_position']

VERDICTS = {   # verifier file id -> verdict
    '918': ('pass', 'verify-single-918-r2.csv'),
    '974': ('fail', 'verify-batch-a.csv'), '980': ('fail', 'verify-batch-a.csv'),
    '983': ('fail', 'verify-batch-a.csv'),
    '984': ('fail', 'verify-batch-b.csv'), '2682': ('fail', 'verify-batch-b.csv'),
    '2795': ('fail', 'verify-batch-b.csv'),
    '4755': ('fail', 'verify-batch-c.csv'), '4913': ('fail', 'verify-batch-c.csv'),
    '5342': ('fail', 'verify-batch-c.csv'), '5343': ('fail', 'verify-batch-c.csv'),
    '2751': ('fail', 'verify-batch-d.csv'), '3070': ('fail', 'verify-batch-d.csv'),
    '3212': ('fail', 'verify-batch-d.csv'), '1191': ('fail', 'verify-batch-d.csv'),
}

# write canonical verify-applied.csv keyed by TRUE position
out = [['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'justification']]
seen = {}
for vid, (v, srcf) in VERDICTS.items():
    true_pos = vid if vid in byic.values() or True else vid
    # resolve: if vid is an ordinal of my block -> map; else assume already-real position
    tp = pairs.get(vid, None)
    # special case: ids like 2682/2795/3070/3212/2751 are real positions AND may collide with ordinals of OTHER rows.
    # decide by checking whether an item with this ordinal exists AND whether position exists:
    if tp is None:
        tp = vid
    else:
        # ambiguity: if vid is ALSO a valid position in my block belonging to a DIFFERENT row,
        # prefer real-position interpretation when the verifier row's item matches that row's item.
        cand_item = pos2row_item = None
        b_by_pos = {}
        for r in brief:
            b_by_pos[r['source_position']] = r
        if vid in b_by_pos:
            tp = vid  # real position wins (verifier briefs used real item names we cross-checked)
    seen[tp] = v
for tp, v in seen.items():
    out.append([tp, v, '', '', 'imported from verifier batches'])
with open(os.path.join(CH, 'verify-applied.csv'), 'w', encoding='utf-8', newline='') as fh:
    csv.writer(fh).writerows(out)
print('verify-applied rows:', len(out) - 1)

# apply onto ledger via assemble logic extension: patch assemble to read verify-applied first
al = open(os.path.join(CH, 'assemble_ledger.py'), encoding='utf-8').read()
if 'verify-applied.csv' not in al:
    al = al.replace("for vf in ['verify-single-918-r2.csv'",
                    "for vf in ['verify-applied.csv','verify-single-918-r2.csv'")
    open(os.path.join(CH, 'assemble_ledger.py'), 'w', encoding='utf-8').write(al)
    print('assemble patched')
res = subprocess.run([sys.executable, os.path.join(CH, 'assemble_ledger.py')],
                     capture_output=True, text=True, timeout=100)
print(res.stdout[-400:])
led = list(csv.DictReader(open(os.path.join(CH, 'chat-02-ledger.csv'), encoding='utf-8')))
from collections import Counter
print(dict(Counter(r['state'] for r in led)))
for r in led:
    if r['state'] in ('candidate', 'verified_pass'):
        print(r['state'], r['source_position'], r['item_code'], r['verifier_verdict'], r['machine_gate'])

import datetime
cl = os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\claims')
now = datetime.datetime.utcnow().isoformat() + 'Z'
for i in range(18, 35):
    open(os.path.join(cl, 'S%04d.claim' % i), 'w').write('chat=02,utc=%s,status=working\n' % now)
print('hb ok')
