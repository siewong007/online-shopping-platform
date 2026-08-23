import csv, glob, os
batch = {}
for f in glob.glob(os.path.join('research', 'batch-*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8-sig')):
        batch[r['source_position']] = (r['item_code'], r['uom'], r['display_name'], r['category'])
seen = set()
for f in sorted(glob.glob(os.path.join('research', 'result-*.csv'))):
    if 'requeue' in f:
        continue
    try:
        rr = list(csv.DictReader(open(f, encoding='utf-8-sig')))
    except Exception:
        continue
    for r in rr:
        p = r.get('source_position')
        if r.get('researcher_decision') == 'candidate' and p not in seen:
            seen.add(p)
            bm = batch.get(p, ('?', '?', '?', '?'))
            print(os.path.basename(f) + '|' + p + '|' + bm[0] + '|' + bm[1] + '|' + bm[2][:65] + '|' + bm[3][:30])
            print('  PAGE: ' + (r.get('official_product_page') or '')[:165])
            print('  IMG : ' + (r.get('official_image_url') or '')[:185])
