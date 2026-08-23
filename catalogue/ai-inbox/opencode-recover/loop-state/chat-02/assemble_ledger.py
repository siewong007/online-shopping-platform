import csv, os, json, sys
sys.stdout.reconfigure(line_buffering=True)
CH = os.path.join(os.path.dirname(os.path.abspath(__file__)))
HDR = ['source_position','item_code','uom','display_name','category','detected_brand','detected_model',
       'state','round_first_seen','round_last_touched','tiers_tried','official_product_page',
       'official_image_url','image_px_w','image_px_h','image_bytes','image_sha256','match_confidence',
       'finish_exact','model_exact','uom_assessment','rights_status','researcher_decision',
       'verifier_verdict','machine_gate','reason','human_action']
merged = {}
files = [f for f in sorted(os.listdir(CH)) if f.startswith('shard-') and f.endswith('.csv')]
for fn in files:
    n = 0
    try:
        with open(os.path.join(CH, fn), encoding='utf-8', errors='replace') as fh:
            for row in csv.DictReader(fh):
                if row.get('source_position'):
                    merged[row['source_position']] = row
                    n += 1
    except Exception as e:
        print('READFAIL', fn, repr(e)[:80])
    print(fn, n)
vres = {}
for vf in ['verify-applied.csv','verify-single-918-r2.csv','verify-batch-a.csv','verify-batch-b.csv','verify-batch-c.csv','verify-batch-d.csv']:
    p = os.path.join(CH, vf)
    if os.path.exists(p):
        try:
            for r in csv.DictReader(open(p, encoding='utf-8')):
                if r.get('source_position'):
                    vres[r['source_position']] = r
            print(vf, 'loaded')
        except Exception as e:
            print('VREADFAIL', vf, repr(e)[:80])
n = 0
for pos, r in merged.items():
    v = vres.get(pos)
    if v and r['state'] == 'candidate':
        r['verifier_verdict'] = v['verifier_verdict']
        r['finish_exact'] = 'yes' if str(v.get('finish_exact','')).lower() == 'yes' else 'no'
        r['model_exact'] = 'yes' if str(v.get('model_exact','')).lower() == 'yes' else 'no'
        if v['verifier_verdict'] == 'pass':
            r['state'] = 'verified_pass'
            r['machine_gate'] = 'pending'
        else:
            r['state'] = 'open'
            r['researcher_decision'] = 'reject'
        n += 1
outp = os.path.join(CH, 'chat-02-ledger.csv')
with open(outp, 'w', encoding='utf-8', newline='') as fh:
    w = csv.DictWriter(fh, fieldnames=HDR)
    w.writeheader()
    for k in sorted(merged, key=int):
        w.writerow({c: merged[k].get(c, '') for c in HDR})
from collections import Counter
print('LEDGER', len(merged), dict(Counter(r['state'] for r in merged.values())), 'applied', n)
