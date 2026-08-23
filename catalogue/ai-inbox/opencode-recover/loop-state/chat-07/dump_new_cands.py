import csv, glob, os
batch = {}
for f in glob.glob(os.path.join('research', 'batch-*.csv')):
    for r in csv.DictReader(open(f, encoding='utf-8-sig')):
        batch[r['source_position']] = (r['item_code'], r['uom'], r['display_name'], r['category'])
known = {'7386', '6872', '7138', '7615', '7186', '7154', '270', '6422', '7331', '4793'}
seen = set()
for f in sorted(glob.glob(os.path.join('research', 'result-*.csv'))):
    if 'requeue' in f:
        continue
    try:
        rows = list(csv.DictReader(open(f, encoding='utf-8-sig')))
    except Exception as e:
        print('bad', f, e)
        continue
    for r in rows:
        if r.get('researcher_decision') == 'candidate' and r['source_position'] not in known:
            bm = batch.get(r['source_position'], ('?', '?', '?', '?'))
            if r['source_position'] in seen:
                continue
            seen.add(r['source_position'])
            print(os.path.basename(f) + '|' + r['source_position'] + '|' + bm[0] + '|' + bm[1] + '|' + bm[2][:70])
            print('  PAGE: ' + r['official_product_page'][:170])
            print('  IMG : ' + r['official_image_url'][:200])
