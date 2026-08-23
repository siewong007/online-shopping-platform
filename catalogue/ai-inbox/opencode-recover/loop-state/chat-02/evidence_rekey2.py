import csv, os, json, sys, subprocess
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
LP = os.path.join(CH, "evidence-log.jsonl")

brief = list(csv.DictReader(open(os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\chat-02.csv'), encoding='utf-8-sig')))
allpos = set(r['source_position'] for r in brief)
ord2pos = {r['ordinal']: r['source_position'] for r in brief}

# ---- 1. fold entire log into one dict ----
merged = {}
if os.path.exists(LP):
    for ln in open(LP, encoding='utf-8', errors='ignore'):
        ln = ln.strip()
        if not ln:
            continue
        try:
            rec = json.loads(ln)['rec']
        except Exception:
            continue
        for k, v in rec.items():
            cur = dict(merged.get(k) or {})
            cur.update({kk: vv for kk, vv in v.items() if vv is not None})
            merged[k] = cur
print('log positions:', len(merged))

# ---- 2. rekey ordinal-ids -> true positions ----
moves = []
for k in list(merged.keys()):
    if k in allpos:
        continue
    tgt = ord2pos.get(k)
    if tgt is None:
        continue
    if tgt in merged:
        # merge fields, prefer existing true record then fill gaps
        cur = dict(merged[tgt])
        for kk, vv in merged[k].items():
            if cur.get(kk) in (None, '', 0) and vv not in (None, '', 0):
                cur[kk] = vv
        merged[tgt] = cur
    else:
        merged[tgt] = merged[k]
    del merged[k]
    moves.append((k, tgt))
print('rekeys:', moves)

# drop non-block junk keys entirely
junk = [k for k in merged if k not in allpos]
for k in junk:
    del merged[k]
print('dropped non-block:', junk)

# ---- 3. rewrite log atomically ----
tmp = LP + '.tmp'
with open(tmp, 'w', encoding='utf-8') as fh:
    fh.write(json.dumps({'_t': 0, 'rec': {k: v for k, v in merged.items()}}, ensure_ascii=False) + '\n')
os.replace(tmp, LP)
json.dump(merged, open(os.path.join(CH, 'evidence.json'), 'w', encoding='utf-8'))
print('log rewritten,', len(merged), 'positions')

# ---- 4. sync verdict-applied states back into shard files ----
led = {r['source_position']: r for r in csv.DictReader(open(os.path.join(CH, 'chat-02-ledger.csv'), encoding='utf-8'))}
synced = 0
for fn in sorted(f for f in os.listdir(CH) if f.startswith('shard-') and f.endswith('.csv')):
    pth = os.path.join(CH, fn)
    rows = list(csv.reader(open(pth, encoding='utf-8')))
    hdr = rows[0]
    idx = {c: hdr.index(c) for c in ('source_position', 'state', 'verifier_verdict', 'researcher_decision', 'machine_gate')}
    ch = False
    for r in rows[1:]:
        if len(r) != len(hdr):
            continue
        L = led.get(r[idx['source_position']])
        if not L:
            continue
        if L['state'] in ('open', 'verified_pass') and r[idx['state']] != L['state']:
            r[idx['state']] = L['state']
            r[idx['verifier_verdict']] = L.get('verifier_verdict', '')
            r[idx['researcher_decision']] = L.get('researcher_decision', '')
            r[idx['machine_gate']] = ''
            ch = True; synced += 1
    if ch:
        csv.writer(open(pth, 'w', encoding='utf-8', newline='')).writerows(rows)
print('shard rows synced:', synced)

# ---- 5. regate r11 ----
res = subprocess.run([sys.executable, os.path.join(CH, 'run_gate.py'), '--round', '11'],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-350:])
g = json.load(open(os.path.join(CH, 'gate-report-r11.json'), encoding='utf-8'))
for r in g['reds']:
    print('RED', r['key'], r['code'], r['detail'][:70])
