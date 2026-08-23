import csv
import datetime
import glob
import json
import os
import pathlib

BASE = r'C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue\ai-inbox\opencode-recover'
CHAT = BASE + r'\loop-state\chat-04'
GR = CHAT + r'\gate-run'

# 1) persist late verifier verdicts
with open(CHAT + r'\verify-r1-misc.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh)
    w.writerow(['source_position', 'verifier_verdict', 'finish_exact', 'model_exact', 'px', 'bytes', 'justification'])
    w.writerow(['3401', 'pass', 'yes', 'yes', '600x600', '21851B', 'Hafele PDP lists Cat.No 489.93.125 Function=Entrance SUS304 knobset; og:image is this exact file'])
    w.writerow(['6796', 'pass', 'yes', 'yes', '3000x3000', '1026202B', 'Spear-and-Jackson Eclipse Junior Saw Blades PDP embeds product-images_11; photo shows Eclipse 71-132R 6in blades'])
    w.writerow(['4552', 'fail', 'yes', 'no', '1600x1600', '41462B', 'Signify asset LPPR1_TLD_STD_G13 is TL-D Standard family hero, not Lifemax'])
print('verify-r1-misc.csv written')

LEDGER_HEADER = ["source_position", "item_code", "uom", "display_name", "category",
                 "detected_brand", "detected_model", "state", "round_first_seen", "round_last_touched",
                 "tiers_tried", "official_product_page", "official_image_url", "image_px_w", "image_px_h",
                 "image_bytes", "image_sha256", "match_confidence", "finish_exact", "model_exact",
                 "uom_assessment", "rights_status", "researcher_decision", "verifier_verdict",
                 "machine_gate", "reason", "human_action"]

rows = list(csv.DictReader(open(GR + r'\loop-ledger.csv', encoding='utf-8')))

# overlay misc verdicts onto candidates
vmap = {}
for v in csv.DictReader(open(CHAT + r'\verify-r1-misc.csv', encoding='utf-8')):
    vmap[v['source_position']] = v
for r in rows:
    p = r['source_position']
    if p in vmap and r['state'] in ('candidate', 'open'):
        r['verifier_verdict'] = vmap[p]['verifier_verdict']

vp = op = 0
for r in rows:
    st, vv = r['state'], r['verifier_verdict']
    if st == 'candidate' and vv == 'pass':
        r['state'] = 'verified_pass'; r['machine_gate'] = 'green'; r['round_last_touched'] = '1'
        r['model_exact'] = r['model_exact'] or 'yes'; r['finish_exact'] = r['finish_exact'] or 'yes'
        vp += 1
    elif st == 'candidate' and vv == 'fail':
        r['state'] = 'open'; r['researcher_decision'] = 'open'; r['round_last_touched'] = '1'
        if 'tiers_tried' not in r or not r['tiers_tried']:
            r['tiers_tried'] = '1'
        if 'verifier rejected' not in r['reason']:
            r['reason'] += ' | verifier rejected - re-open tier+1'
        r['official_image_url'] = ''; r['image_sha256'] = ''
        op += 1
print('verified_pass:', vp, 'rejected->open:', op)

with open(GR + r'\loop-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows)
with open(CHAT + r'\chat-04-ledger.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=LEDGER_HEADER)
    w.writeheader(); w.writerows(rows)

# sync enrichments/states back into shard files (robust)
enr = {r['source_position']: r for r in rows}
for f in sorted(glob.glob(CHAT + r'\shard-r1-batch-*.csv')):
    try:
        src = list(csv.DictReader(open(f, encoding='utf-8')))
        if not src or 'source_position' not in (src[0].keys() or []):
            print('SKIP malformed shard (no source_position):', os.path.basename(f))
            continue
        changed = False
        out = []
        for r in src:
            e = enr.get(r.get('source_position'))
            if e:
                if r.get('detected_model') != e['detected_model'] and e['detected_model']:
                    r['detected_model'] = e['detected_model']; changed = True
                if e['reason'] and 'grounded_model_string' in e['reason'] and 'grounded_model_string' not in (r.get('reason') or ''):
                    tail = [seg for seg in e['reason'].split(' | ') if seg.startswith('grounded_model_string')]
                    if tail:
                        r['reason'] = (r.get('reason') or '') + ' | ' + tail[0]; changed = True
                if r.get('state') == 'candidate' and e['state'] in ('verified_pass', 'open'):
                    r['state'] = e['state']; r['machine_gate'] = e.get('machine_gate', ''); changed = True
            out.append(r)
        if changed:
            with open(f, 'w', newline='', encoding='utf-8') as fh:
                w = csv.DictWriter(fh, fieldnames=list(src[0].keys()))
                w.writeheader(); w.writerows(out)
            print('synced', os.path.basename(f))
    except Exception as ex:
        print('SYNC FAIL', os.path.basename(f), repr(ex))

# hashes.csv rebuild
seen = {}
for f in sorted(glob.glob(CHAT + r'\evidence-r1-*.json')):
    b = f.split('batch-')[1].split('.')[0]
    smap = {}
    sf = CHAT + r'\shard-r1-batch-' + b + '.csv'
    if os.path.exists(sf):
        try:
            for rr in csv.DictReader(open(sf, encoding='utf-8')):
                smap[rr.get('source_position')] = rr
        except Exception:
            pass
    for pos, e in json.load(open(f, encoding='utf-8')).items():
        sha = e.get('image_sha256') or ''
        if not sha or pos in seen:
            continue
        seen[pos] = [pos, (smap.get(pos) or {}).get('item_code', ''), (smap.get(pos) or {}).get('uom', ''),
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
