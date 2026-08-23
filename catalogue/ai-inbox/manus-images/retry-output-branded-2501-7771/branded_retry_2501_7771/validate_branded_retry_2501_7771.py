import csv,hashlib,json
from pathlib import Path
from collections import Counter
q=Path('/mnt/b49a8554-a5f8-48f7-a0f6-8f2f2c61afe2/ekoway hardware website/online-shopping-platform/catalogue/ai-inbox/manus-images/retry-queue-branded-2501-7771.csv')
p=Path('/home/ubuntu/work/retry_branded_2501_7771/retry_queue_branded_2501_7771_reviewed.csv')
qrows=list(csv.DictReader(q.open(newline='',encoding='utf-8'))); rows=list(csv.DictReader(p.open(newline='',encoding='utf-8')))
assert len(qrows)==2838 and len(rows)==2838
qpos=[int(r['source_position']) for r in qrows]; pos=[int(r['source_position']) for r in rows]; assert pos==qpos and len(set(pos))==2838
assert Counter(r['first_pass_status'] for r in rows)==Counter({'VERIFIED_CANDIDATE':10,'PENDING':2828})
assert Counter(r['final_image_status'] for r in rows)==Counter({'candidate':10,'pending':2828})
assert Counter(r['rights_status_final'] for r in rows)==Counter({'needs_permission':2838})
for r in rows:
 if r['first_pass_status']=='VERIFIED_CANDIDATE':
  asset=Path(r['evidence_asset_path']); assert r['source_url'] and r['image_source_url'] and r['image_exactness']=='EXACT_SKU'; assert int(r['identity_confidence'])>=90 and int(r['image_confidence'])>=90; assert asset.exists() and asset.stat().st_size==int(r['evidence_bytes']); assert hashlib.sha256(asset.read_bytes()).hexdigest()==r['evidence_sha256']
print(json.dumps({'status':'PASS','rows':2838,'positions':'2501-7769 selected retry rows','verified_candidate':10,'pending':2828,'rejected':0,'rights_status':'needs_permission for all rows','candidate_positions':[int(r['source_position']) for r in rows if r['first_pass_status']=='VERIFIED_CANDIDATE']},indent=2))
