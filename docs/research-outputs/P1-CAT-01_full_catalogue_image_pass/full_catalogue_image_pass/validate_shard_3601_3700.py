import csv,json
from pathlib import Path
from collections import Counter
out=Path('/home/ubuntu/work/full_catalogue_image_pass'); p=out/'products_3601_3700_reviewed.csv'; rows=list(csv.DictReader(p.open(newline='',encoding='utf-8')))
assert len(rows)==100; pos=[int(r['source_position']) for r in rows]; assert pos==list(range(3601,3701)); assert len(set(pos))==100
counts=Counter(r['first_pass_status'] for r in rows); assert counts==Counter({'PENDING':100}); assert Counter(r['final_image_status'] for r in rows)==Counter({'pending':100}); assert Counter(r['rights_status_final'] for r in rows)==Counter({'needs_permission':100})
print(json.dumps({'status':'PASS','rows':len(rows),'positions':'3601-3700','counts':dict(counts),'rights_status':'needs_permission for all rows','candidate_positions':[]},indent=2))
