import csv,json,hashlib,glob
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass'); idx=root/'full_catalogue_coverage_index.csv'; rows=list(csv.DictReader(idx.open(newline='',encoding='utf-8')))
assert len(rows)==7771
positions=[int(r['source_position']) for r in rows]; assert positions==list(range(1,7772)); assert len(set(positions))==7771
assert all(r['coverage_source'] and r['coverage_source']!='none' for r in rows)
assert all(r['existing_rights_status']=='needs_permission' for r in rows)
classes=Counter(r['existing_classification'] for r in rows); image=Counter(r['existing_image_status'] for r in rows)
assert classes['REJECTED']==0
# verify all completed full-pass shards are present and source positions are exact
shards=[]
for start in list(range(2501,7701,100))+[7701]:
 end=min(start+99,7771); p=root/f'products_{start}_{end}_reviewed.csv'; assert p.exists(),str(p); sr=list(csv.DictReader(p.open(newline='',encoding='utf-8'))); assert len(sr)==end-start+1; sp=[int(r['source_position']) for r in sr]; assert sp==list(range(start,end+1)); assert all(r['rights_status_final']=='needs_permission' for r in sr); shards.append({'range':f'{start}-{end}','rows':len(sr),'verified_candidate':sum(r['first_pass_status']=='VERIFIED_CANDIDATE' for r in sr),'pending':sum(r['first_pass_status']=='PENDING' for r in sr),'rejected':sum(r['first_pass_status']=='REJECTED' for r in sr),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert sum(x['rows'] for x in shards)==5271
assert Counter(r['review_status'] for r in rows) # non-empty index status
report={'status':'PASS','manifest_rows':7771,'covered_rows':len(rows),'uncovered_rows':0,'classification_counts':dict(classes),'image_status_counts':dict(image),'rights_status':'needs_permission for all rows','full_pass_shards':len(shards),'full_pass_rows':sum(x['rows'] for x in shards),'full_pass_candidate_count':sum(x['verified_candidate'] for x in shards),'full_pass_pending_count':sum(x['pending'] for x in shards),'full_pass_rejected_count':sum(x['rejected'] for x in shards),'candidate_positions':[int(r['source_position']) for r in rows if r['existing_classification']=='VERIFIED_CANDIDATE'],'queue_rows':sum(1 for _ in csv.DictReader((root/'full_catalogue_research_queue.csv').open(newline='',encoding='utf-8'))),'shards':shards}
(root/'final_coverage_validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8'); print(json.dumps(report,indent=2))
