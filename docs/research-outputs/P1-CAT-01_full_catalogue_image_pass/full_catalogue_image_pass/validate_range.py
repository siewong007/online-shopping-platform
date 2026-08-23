import csv,hashlib,sys,json
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass'); start=int(sys.argv[1]); end=int(sys.argv[2]); p=root/f'products_{start}_{end}_reviewed.csv'; rows=list(csv.DictReader(p.open(newline='',encoding='utf-8')))
assert len(rows)==end-start+1
pos=[int(r['source_position']) for r in rows]; assert pos==list(range(start,end+1)); assert len(set(pos))==len(rows)
assert Counter(r['first_pass_status'] for r in rows)==Counter({'PENDING':len(rows)})
assert Counter(r['final_image_status'] for r in rows)==Counter({'pending':len(rows)})
assert Counter(r['rights_status_final'] for r in rows)==Counter({'needs_permission':len(rows)})
for r in rows:
 assert not r['evidence_asset_path'] and not r['evidence_sha256'] and not r['evidence_bytes']
print(json.dumps({'status':'PASS','rows':len(rows),'positions':f'{start}-{end}','counts':{'PENDING':len(rows)},'rights_status':'needs_permission for all rows','candidate_positions':[]},indent=2))
