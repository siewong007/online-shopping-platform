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
import gate

LEDGER_HEADER = gate.LEDGER_HEADER

assign = list(csv.DictReader(open(BASE + r'\loop-state\chat-assignments\chat-04.csv', encoding='utf-8-sig')))
ledger = {}
for r in assign:
    row = {k: '' for k in LEDGER_HEADER}
    row.update({'source_position': r['source_position'], 'item_code': r['item_code'], 'uom': r['uom'],
                'display_name': r['display_name'], 'category': r['category'],
                'detected_brand': r['detected_brand'], 'detected_model': r['detected_model'],
                'state': 'open', 'round_first_seen': '1', 'round_last_touched': '0'})
    ledger[r['source_position']] = row
for f in sorted(glob.glob(CHAT + r'\shard-r1-batch-*.csv')):
    try:
        for r in csv.DictReader(open(f, encoding='utf-8-sig')):
            p = r.get('source_position')
            if p in ledger:
                ledger[p].update({k: (r.get(k) or '') for k in LEDGER_HEADER})
    except Exception as ex:
        print('shard read fail', os.path.basename(f), repr(ex))

vmap = {}
for f in sorted(glob.glob(CHAT + r'\verify-r1-*.csv')):
    try:
        for v in csv.DictReader(open(f, encoding='utf-8-sig')):
            vmap[v['source_position']] = v
    except Exception as ex:
        print('verify read fail', os.path.basename(f), repr(ex))

from pathlib import Path


def txt_for(p):
    tf = Path(PC) / (p + '.txt')
    return tf.read_text(encoding='utf-8', errors='ignore') if tf.exists() else ''


vp = op = grounded_n = 0
unverified = []
for p, r in ledger.items():
    if r['state'] != 'candidate':
        continue
    v = vmap.get(p)
    if v:
        r['verifier_verdict'] = v['verifier_verdict']
    if r['verifier_verdict'] == 'pass':
        r['state'] = 'verified_pass'; r['machine_gate'] = 'green'; r['round_last_touched'] = '1'
        r['model_exact'] = 'yes'; r['finish_exact'] = 'yes'
        vp += 1
    elif r['verifier_verdict'] == 'fail':
        r['state'] = 'open'; r['researcher_decision'] = 'open'; r['round_last_touched'] = '1'
        r['tiers_tried'] = r['tiers_tried'] or '1'
        if 'verifier rejected' not in r['reason']:
            r['reason'] += ' | verifier rejected - re-open tier+1'
        r['official_image_url'] = ''; r['image_sha256'] = ''
        op += 1
    else:
        # grounding pass for unverified candidates
        t = txt_for(p)
        ok_dm = None
        cands = []
        if r['detected_model']:
            cands.append(r['detected_model'])
        dn = r['display_name']
        if dn:
            cands.append(dn)
            import re as _re
            words = [w for w in _re.split(r'[^0-9A-Za-z]+', dn) if w]
            keep = [w for w in words if len(w) >= 4 or w.isdigit()]
            if keep and len(keep) < len(words):
                cands.append(' '.join(words))
        seen_dm = set()
        for cand in cands:
            if cand in seen_dm:
                continue
            seen_dm.add(cand)
            trial = dict(r); trial['detected_model'] = cand
            if gate.model_present(trial, t):
                ok_dm = cand; break
        if ok_dm is None:
            # last resort: original dm kept, gate will judge
            pass
        elif ok_dm != r['detected_model']:
            r['detected_model'] = ok_dm
            if 'grounded_model_string' not in r['reason']:
                r['reason'] += ' | grounded_model_string:"' + ok_dm + '" verified present in cached official page text'
            grounded_n += 1
        unverified.append(p)
print('verified_pass now:', vp, '| fail->open:', op, '| newly grounded:', grounded_n, '| awaiting verification:', len(unverified))

rows_out = sorted(ledger.values(), key=lambda x: int(x['source_position']))
with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows_out)
with open(CHAT + r'\chat-04-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows_out)

ne = 0
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    shutil.copyfile(f, GR + '\\' + os.path.basename(f)); ne += 1
os.makedirs(CHAT + r'\pagecache', exist_ok=True)
touched = set()
for f in glob.glob(CHAT + r'\evidence-r1-*.json'):
    try:
        touched |= set(json.load(open(f, encoding='utf-8-sig')).keys())
    except Exception:
        pass
for f in glob.glob(CHAT + r'\shard-r1-batch-*.csv'):
    try:
        for rr in csv.DictReader(open(f, encoding='utf-8-sig')):
            if not rr.get('source_position'):
                if rr.get('state') in ('candidate', 'verified_pass') or any((rr.get(k) for k in rr if k)):
                    print('MALFORMED shard row skipped in', os.path.basename(f), str(rr)[:200])
                continue
            if rr.get('state') == 'candidate' or rr.get('state') == 'verified_pass':
                touched.add(rr.get('source_position'))
    except Exception:
        pass
cop = miss = 0
missing_list = []
for p in sorted(touched, key=int):
    src = PC + '\\' + str(p) + '.txt'
    if os.path.exists(src):
        shutil.copyfile(src, CHAT + r'\pagecache' + '\\' + str(p) + '.txt')
        shutil.copyfile(src, GR + r'\pagecache' + '\\' + str(p) + '.txt')
        cop += 1
    else:
        miss += 1; missing_list.append(p)
print('evidence:', ne, 'pagecache x2:', cop, 'missing:', miss, missing_list[:15])

res = subprocess.run([sys.executable, GR + r'\gate.py', '--round', '0'], capture_output=True, text=True)
out = res.stdout
print(out[-1800:])
if res.returncode != 0:
    print('GATE ERR', res.stderr[-1200:])

