import csv, os, sys
base = os.path.dirname(os.path.abspath(__file__))
pos = {'4306','4330','3622','4669','2582','6437','4755','4913','2682','2795'}
for f in ['shard-960-989.csv','shard-870-899.csv','shard-1170-1199.csv']:
    p = os.path.join(base, f)
    with open(p, encoding='utf-8-sig', newline='') as fh:
        for r in csv.DictReader(fh):
            if r['source_position'] in pos:
                print('==', r['source_position'], r['item_code'], 'state=', r['state'], 'tiers=', r['tiers_tried'], 'dec=', r['researcher_decision'], 'verdict=', repr(r.get('verifier_verdict'))[:160], 'gate=', repr(r.get('machine_gate'))[:100])
                print('   name=', r['display_name'], '| model=', r['detected_model'])
                print('   url=', r['official_product_page'])
                print('   img=', r['official_image_url'], r['image_px_w'], r['image_px_h'], r['image_bytes'], r['image_sha256'][:16])
