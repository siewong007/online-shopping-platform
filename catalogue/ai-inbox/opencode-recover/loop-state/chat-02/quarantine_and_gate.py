import csv, os, json, sys, subprocess
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")

brief = list(csv.DictReader(open(os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\chat-02.csv'), encoding='utf-8-sig')))
byp = {r['source_position']: r for r in brief}
for p in ['5342', '5343']:
    b = byp.get(p)
    print('brief', p, '->', (b['item_code'], b['display_name'][:40]) if b else 'NOT MINE')

# foreign-item quarantine: shard rows whose (item_code,uom) not in brief get state=open + flag
bykey = {(r['item_code'], r['uom']) for r in brief}
quarantined = 0
for fn in sorted(f for f in os.listdir(CH) if f.startswith('shard-') and f.endswith('.csv')):
    pth = os.path.join(CH, fn)
    rows = list(csv.reader(open(pth, encoding='utf-8')))
    hdr = rows[0]
    ip = hdr.index('source_position'); icod = hdr.index('item_code'); iu = hdr.index('uom')
    ist = hdr.index('state'); idc = hdr.index('researcher_decision'); irs = hdr.index('reason')
    iha = hdr.index('human_action'); ivv = hdr.index('verifier_verdict')
    ch = False
    for r in rows[1:]:
        if len(r) != len(hdr):
            continue
        if (r[icod], r[iu]) not in bykey and r[ist] != 'open':
            r[ist] = 'open'; r[idc] = 'reject'
            r[ivv] = 'fail'
            r[irs] = (r[irs] + ' | QUARANTINE: item_code+uom not in chat-02 assignment block; requeue to owning chat')[:2000]
            if not r[iha]:
                r[iha] = 'Verify block ownership; process in owning chat'
            ch = True; quarantined += 1
    if ch:
        csv.writer(open(pth, 'w', encoding='utf-8', newline='')).writerows(rows)
print('quarantined:', quarantined)

res = subprocess.run([sys.executable, os.path.join(CH, 'assemble_ledger.py')],
                     capture_output=True, text=True, timeout=100)
print(res.stdout[-200:])
res = subprocess.run([sys.executable, os.path.join(CH, 'run_gate.py'), '--round', '10'],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-400:])
g = json.load(open(os.path.join(CH, 'gate-report-r10.json'), encoding='utf-8'))
for r in g['reds']:
    print('RED', r['key'], r['code'], r['detail'][:70])

led = list(csv.DictReader(open(os.path.join(CH, 'chat-02-ledger.csv'), encoding='utf-8')))
print('---opens---')
n = 0
for r in led:
    if r['state'] == 'open':
        n += 1
        print(r['source_position'], r['item_code'][:32], '|', r['tiers_tried'][:24], '|', (r['reason'] or '')[:50])
print('open total:', n)
