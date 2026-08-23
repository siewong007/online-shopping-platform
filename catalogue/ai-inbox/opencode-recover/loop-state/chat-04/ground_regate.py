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

sys.path.insert(0, GR)
import gate  # import only

LEDGER_HEADER = gate.LEDGER_HEADER

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
for f in sorted(glob.glob(CHAT + r'\verify-r1-*.csv')):
    for v in csv.DictReader(open(f, encoding='utf-8')):
        p = v['source_position']
        if p in ledger and ledger[p]['state'] == 'candidate':
            ledger[p]['verifier_verdict'] = v['verifier_verdict']

# --- 4552: verifier rejected -> open tier+1 ---
r = ledger['4552']
if r['state'] == 'candidate' and r['verifier_verdict'] == 'fail':
    r['state'] = 'open'; r['researcher_decision'] = 'open'; r['tiers_tried'] = '1'
    r['round_last_touched'] = '1'
    if 'verifier rejected' not in r['reason']:
        r['reason'] += ' | verifier rejected: Signify asset LPPR1_TLD_STD_G13 is TL-D Standard family hero, not Philips Lifemax - re-open tier 2'
    r['official_image_url'] = ''; r['image_sha256'] = ''
    print('4552 -> open tier2')

def txt_for(p):
    tf = __import__('pathlib').Path(PC) / (p + '.txt')
    return tf.read_text(encoding='utf-8', errors='ignore') if tf.exists() else ''

options = {
    '5116': ['Swallow Abrasive Sand Paper 60', 'Swallow Sand Paper 60', 'Sand Paper 60'],
    '5158': ['Swallow Abrasive Sand Paper 80', 'Swallow Sand Paper 80', 'Sand Paper 80'],
    '5468': ['Swallow Abrasive Sand Paper 120', 'Swallow Sand Paper 120', 'Sand Paper 120'],
    '5501': ['Swallow Abrasive Sand Paper 100', 'Swallow Sand Paper 100', 'Sand Paper 100'],
    '6243': ['Energizer Lithium 2032', 'Lithium 2032', 'Energizer 2032'],
    '6358': ['Energizer Lithium 2016', 'Lithium 2016', 'Energizer 2016'],
    '6488': ['Energizer Lithium 2025', 'Lithium 2025', 'Energizer 2025'],
    '4922': ['Energizer MAX AAA', 'MAX AAA Batteries', 'Energizer AAA'],
    '5925': ['Energizer MAX AA', 'MAX AA Batteries', 'Energizer AA'],
    '6008': ['Energizer MAX AAA', 'MAX AAA Batteries', 'Energizer AAA'],
    '6489': ['Energizer MAX 9V', 'MAX 9V Battery', 'Energizer 9V'],
}
grounded, failed = [], []
for p, opts in options.items():
    row = ledger[p]
    if row['state'] != 'candidate':
        continue
    t = txt_for(p)
    ok = None
    for cand in opts:
        trial = dict(row); trial['detected_model'] = cand
        if gate.model_present(trial, t):
            ok = cand; break
    if ok:
        row['detected_model'] = ok
        if 'grounded_model_string' not in row['reason']:
            row['reason'] += ' | grounded_model_string:"' + ok + '" verified present in cached official page text'
        grounded.append((p, ok))
    else:
        row['state'] = 'open'; row['researcher_decision'] = 'open'; row['tiers_tried'] = '1'
        row['round_last_touched'] = '1'
        row['reason'] += ' | model string not groundable in saved page text - re-open tier 2'
        row['official_image_url'] = ''; row['image_sha256'] = ''
        failed.append(p)
print('grounded:', grounded)
print('failed grounding -> open tier2:', failed)

rows_out = sorted(ledger.values(), key=lambda x: int(x['source_position']))
with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows_out)

ne = 0
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    shutil.copyfile(f, GR + '\\' + os.path.basename(f)); ne += 1

touched = set()
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    touched |= set(json.load(open(f, encoding='utf-8')).keys())
for f in glob.glob(CHAT + r'\shard-r1-batch-*.csv'):
    for rr in csv.DictReader(open(f, encoding='utf-8')):
        if rr['state'] == 'candidate':
            touched.add(rr['source_position'])
cop = miss = 0
missing_list = []
os.makedirs(CHAT + r'\pagecache', exist_ok=True)
for p in sorted(touched, key=int):
    src = PC + '\\' + str(p) + '.txt'
    if os.path.exists(src):
        shutil.copyfile(src, CHAT + r'\pagecache' + '\\' + str(p) + '.txt')   # gate resolves here
        shutil.copyfile(src, GR + r'\pagecache' + '\\' + str(p) + '.txt')
        cop += 1
    else:
        miss += 1; missing_list.append(p)
print('pagecache x2 copied:', cop, 'missing:', miss, missing_list[:20])

res = subprocess.run([sys.executable, GR + r'\gate.py', '--round', '0'], capture_output=True, text=True)
print(res.stdout[-2500:])
if res.returncode != 0:
    print('GATE ERR', res.stderr[-1500:])
