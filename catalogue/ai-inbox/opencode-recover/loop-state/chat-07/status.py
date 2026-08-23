import csv, glob, os

rows = list(csv.DictReader(open('chat-07-ledger.csv', encoding='utf-8-sig')))
vp = [r for r in rows if r['state'] == 'verified_pass']
print('VERIFIED_PASS', len(vp), sorted((r['source_position'] for r in vp), key=int))
for r in rows:
    if r['researcher_decision'] == 'candidate' and r['state'] != 'verified_pass':
        print(r['source_position'], r['item_code'][:26], '|', r['machine_gate'], '| v=' + str(r['verifier_verdict'])[:14])

print('--- new candidates from B10x')
batch = {}
for f in glob.glob(os.path.join('research', 'batch-*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8-sig')):
        batch[r['source_position']] = (r['item_code'], r['uom'], r['display_name'])
known = {'7386', '6872', '7138', '7615', '7186', '7154', '270', '6422', '7331', '4793',
         '79', '190', '48', '259', '200', '209', '20', '170', '194', '224', '107', '171'}
seen = set(known)
for f in sorted(glob.glob(os.path.join('research', 'result-B1*.csv'))):
    try:
        rr = list(csv.DictReader(open(f, encoding='utf-8-sig')))
    except Exception:
        continue
    for r in rr:
        p = r.get('source_position')
        if r.get('researcher_decision') == 'candidate' and p not in seen:
            seen.add(p)
            bm = batch.get(p, ('?', '?', '?'))
            print(os.path.basename(f) + '|' + p + '|' + bm[0] + '|' + bm[1] + '|' + bm[2][:60])
            print('  PAGE: ' + (r.get('official_product_page') or '')[:160])
            print('  IMG : ' + (r.get('official_image_url') or '')[:180])
