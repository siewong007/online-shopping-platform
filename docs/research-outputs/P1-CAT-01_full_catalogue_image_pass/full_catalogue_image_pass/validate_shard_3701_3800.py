import csv,hashlib,json
from pathlib import Path
from collections import Counter
out=Path('/home/ubuntu/work/full_catalogue_image_pass'); p=out/'products_3701_3800_reviewed.csv'; rows=list(csv.DictReader(p.open(newline='',encoding='utf-8')))
assert len(rows)==100
pos=[int(r['source_position']) for r in rows]; assert pos==list(range(3701,3801)); assert len(set(pos))==100
counts=Counter(r['first_pass_status'] for r in rows); assert counts==Counter({'PENDING':99,'VERIFIED_CANDIDATE':1})
assert Counter(r['final_image_status'] for r in rows)==Counter({'pending':99,'candidate':1})
assert Counter(r['rights_status_final'] for r in rows)==Counter({'needs_permission':100})
for r in rows:
 if r['first_pass_status']=='VERIFIED_CANDIDATE':
  assert r['source_url'] and r['image_source_url'] and r['image_exactness']=='EXACT_SKU' and int(r['identity_confidence'])>=90 and int(r['image_confidence'])>=90 and r['evidence_asset_path'] and Path(r['evidence_asset_path']).exists() and hashlib.sha256(Path(r['evidence_asset_path']).read_bytes()).hexdigest()==r['evidence_sha256']
print(json.dumps({'status':'PASS','rows':len(rows),'positions':'3701-3800','counts':dict(counts),'rights_status':'needs_permission for all rows','candidate_positions':[int(r['source_position']) for r in rows if r['first_pass_status']=='VERIFIED_CANDIDATE']},indent=2))
