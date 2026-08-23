import csv, os, glob
base = os.path.dirname(os.path.abspath(__file__))
want = {'974','980','983','984','1191','1197','1035','5771','918','5378','954','2653','964','4132'}
seen = {}
for p in glob.glob(os.path.join(base, 'shard-*.csv')) + [os.path.join(base,'chat-02-ledger.csv')]:
    try:
        with open(p, encoding='utf-8-sig', newline='') as fh:
            for r in csv.DictReader(fh):
                sp = r.get('source_position')
                if sp in want and sp not in seen:
                    seen[sp] = (os.path.basename(p), r['item_code'], r['uom'], r['display_name'][:45], r['official_image_url'][:80])
    except Exception as e:
        pass
for k in sorted(want, key=int):
    print(k, seen.get(k))
