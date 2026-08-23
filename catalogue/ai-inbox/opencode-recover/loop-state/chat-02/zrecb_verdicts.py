import csv, os
base = os.path.dirname(os.path.abspath(__file__))
pos = {'4306','4330','3622','4669','2582','6437','4755','4913','2682','2795'}
for f in ['verify-applied.csv','verify-batch-a.csv','verify-batch-b.csv','verify-batch-c.csv','verify-batch-d.csv','verify-batch-e.csv']:
    p = os.path.join(base, f)
    if not os.path.exists(p): continue
    with open(p, encoding='utf-8-sig', newline='') as fh:
        rd = csv.DictReader(fh)
        cols = rd.fieldnames
        for r in rd:
            if r.get('source_position') in pos:
                print('--', f, '|', r.get('source_position'))
                for k in cols:
                    v = (r.get(k) or '').strip()
                    if v:
                        print('   ', k, '=', v[:300])
