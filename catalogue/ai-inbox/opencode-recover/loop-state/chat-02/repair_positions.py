import csv, os, json, shutil, sys
sys.stdout.reconfigure(line_buffering=True)
BASE = r"C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform"
CH = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover\loop-state\chat-02")
PC = os.path.join(BASE, r"catalogue\ai-inbox\opencode-recover", "pagecache")
AS = os.path.join(BASE, "assets")

brief = list(csv.DictReader(open(os.path.join(BASE, r'catalogue\ai-inbox\opencode-recover\loop-state\chat-assignments\chat-02.csv'), encoding='utf-8-sig')))
bykey = {}
for r in brief:
    bykey[(r['item_code'], r['uom'])] = r['source_position']
allpos = set(r['source_position'] for r in brief)

# fuzzy check for mystery items anywhere in file
for frag in ['NP19', 'NP-19', 'EH711', 'LB39H', 'BAH', 'HAG', 'TAJ']:
    hits = [r['item_code'] for r in brief if frag in r['item_code'].upper()][:3]
    if hits:
        print('brief contains', frag, hits)
    else:
        print('brief lacks', frag)

# 1. build remap per shard row: old_pos -> new_pos (only when old_pos invalid or key mismatch)
remap = {}          # old -> new
conflicts = []
shards = sorted(f for f in os.listdir(CH) if f.startswith('shard-') and f.endswith('.csv'))
for fn in shards:
    p = os.path.join(CH, fn)
    rows = list(csv.reader(open(p, encoding='utf-8')))
    hdr = rows[0]
    ip = hdr.index('source_position')
    icod = hdr.index('item_code'); iu = hdr.index('uom')
    changed = False
    for r in rows[1:]:
        if len(r) != len(hdr):
            continue
        old = r[ip]
        truth = bykey.get((r[icod], r[iu]))
        if truth is None:
            conflicts.append((fn, old, r[icod], 'ITEM NOT IN BRIEF'))
            continue
        if old != truth:
            if old in remap and remap[old] != truth:
                conflicts.append((fn, old, truth, 'CONFLICTING REMAP'))
            remap[old] = truth
            r[ip] = truth
            changed = True
    if changed:
        csv.writer(open(p, 'w', encoding='utf-8', newline='')).writerows(rows)
print('remap entries:', len(remap))
print('conflicts:', conflicts[:10])

# 2. re-key pagecache / assets / evidence / hashes
renamed = skipped = 0
for old, new in remap.items():
    src = os.path.join(PC, old + '.txt')
    dst = os.path.join(PC, new + '.txt')
    if os.path.exists(src) and not os.path.exists(dst):
        shutil.move(src, dst); renamed += 1
    elif os.path.exists(src) and os.path.exists(dst):
        # keep the one belonging to the correct row: overwrite with old content only if dst absent-history
        skipped += 1
    for ext in ('.jpg', '.png', '.webp', '.gif'):
        s2 = os.path.join(AS, old + ext)
        d2 = os.path.join(AS, new + ext)
        if os.path.exists(s2) and not os.path.exists(d2):
            shutil.move(s2, d2)
        s3 = os.path.join(CH, 'assets', old + ext)
        d3 = os.path.join(CH, 'assets', new + ext)
        if os.path.exists(s3) and not os.path.exists(d3):
            shutil.move(s3, d3)
print('pagecache renamed:', renamed, 'skipped(existing dst):', skipped)

# evidence re-key
sys.path.insert(0, CH)
import fetchlib as F
ev = F.load_evidence()
moved = []
for old, new in remap.items():
    if old in ev and old != new:
        rec = ev.pop(old)
        cur = dict(ev.get(new) or {})
        cur.update({k: v for k, v in rec.items() if v is not None})
        ev[new] = cur
        moved.append((old, new))
tmp = F.EVIDENCE_PATH + '.tmp'
json.dump(ev, open(tmp, 'w', encoding='utf-8'))
os.replace(tmp, F.EVIDENCE_PATH)
print('evidence re-keyed:', moved)

# hashes.csv: append corrected identity rows for every re-keyed image-bearing record
hp = os.path.join(CH, 'hashes.csv')
with open(hp, 'a', encoding='utf-8', newline='') as fh:
    w = csv.writer(fh)
    for new, rec in ev.items():
        if rec.get('image_sha256') and str(new) in [n for _, n in moved]:
            w.writerow([new, '', '', rec.get('image_final_url', ''), rec.get('image_sha256', ''),
                        rec.get('px_w', 0), rec.get('px_h', 0), rec.get('image_bytes_len', 0)])
print('hashes appended')

# 3. coverage audit after remap
done = set()
for fn in shards:
    for r in csv.DictReader(open(os.path.join(CH, fn), encoding='utf-8')):
        if r.get('source_position'):
            done.add(r['source_position'])
print('coverage now:', len(done & allpos), 'of', len(allpos))

# 4. regate r9
import subprocess
res = subprocess.run([sys.executable, os.path.join(CH, 'run_gate.py'), '--round', '9'],
                     capture_output=True, text=True, timeout=110)
print(res.stdout[-400:])
g = json.load(open(os.path.join(CH, 'gate-report-r9.json'), encoding='utf-8'))
for r in g['reds'][:12]:
    print(r['key'], r['code'], r['detail'][:70])
