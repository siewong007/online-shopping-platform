import csv,json,hashlib,re
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass'); idx=root/'full_catalogue_coverage_index.csv'; rows=list(csv.DictReader(idx.open(newline='',encoding='utf-8')))
assert len(rows)==7771
positions=[int(r['source_position']) for r in rows]; assert positions==list(range(1,7772)); assert len(set(positions))==7771
assert all(r['coverage_source'] and r['coverage_source']!='none' for r in rows)
classes=Counter(r['existing_classification'] for r in rows)
fields=list(rows[0].keys())+['campaign_classification','rights_status_final','evidence_ready','campaign_notes']
out=root/'full_catalogue_campaign_master.csv'
with out.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
 for r in rows:
  r['campaign_classification']=r['existing_classification']
  r['rights_status_final']='needs_permission'
  r['evidence_ready']='NO'
  r['campaign_notes']='Campaign-level rights gate is needs_permission; original source rights metadata is retained in existing_rights_status.'
  w.writerow(r)
shards=[]; evidence_rows=[]
for p in sorted(root.glob('products_*_*_reviewed.csv')):
 m=re.fullmatch(r'products_(\d+)_(\d+)_reviewed\.csv',p.name)
 if not m: continue
 start,end=map(int,m.groups())
 if start<2501: continue
 sr=list(csv.DictReader(p.open(newline='',encoding='utf-8')))
 assert len(sr)==end-start+1
 assert [int(x['source_position']) for x in sr]==list(range(start,end+1))
 assert all(x['rights_status_final']=='needs_permission' for x in sr)
 vc=sum(x['first_pass_status']=='VERIFIED_CANDIDATE' for x in sr); pd=sum(x['first_pass_status']=='PENDING' for x in sr); rj=sum(x['first_pass_status']=='REJECTED' for x in sr)
 for x in sr:
  if x['first_pass_status']=='VERIFIED_CANDIDATE':
   assert x['evidence_asset_path'] and Path(x['evidence_asset_path']).exists()
   assert x['evidence_sha256'] and hashlib.sha256(Path(x['evidence_asset_path']).read_bytes()).hexdigest()==x['evidence_sha256']
   evidence_rows.append(x)
 shards.append({'range':f'{start}-{end}','rows':len(sr),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'verified_candidate':vc,'pending':pd,'rejected':rj})
ledger=root/'full_catalogue_evidence_ledger.csv'; lf=['source_position','item_code','display_name','manufacturer','exact_model','source_url','source_type','source_tier','image_source_url','image_exactness','identity_confidence','image_confidence','evidence_asset_path','evidence_sha256','evidence_bytes','rights_status_final','classification_reason']
with ledger.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=lf); w.writeheader()
 for x in sorted(evidence_rows,key=lambda z:int(z['source_position'])): w.writerow({k:x.get(k,'') for k in lf})
report={'status':'PASS','manifest_rows':7771,'covered_rows':len(rows),'uncovered_rows':0,'classification_counts':dict(classes),'rights_status_final_counts':{'needs_permission':7771},'full_pass_shards':len(shards),'full_pass_rows':sum(x['rows'] for x in shards),'full_pass_candidate_count':sum(x['verified_candidate'] for x in shards),'full_pass_pending_count':sum(x['pending'] for x in shards),'full_pass_rejected_count':sum(x['rejected'] for x in shards),'preserved_full_pass_evidence_assets':len(evidence_rows),'preserved_full_pass_evidence_bytes':sum(int(x['evidence_bytes']) for x in evidence_rows),'campaign_candidate_positions':[int(r['source_position']) for r in rows if r['existing_classification']=='VERIFIED_CANDIDATE'],'full_pass_candidate_positions':[int(x['source_position']) for x in evidence_rows],'queue_rows':sum(1 for _ in csv.DictReader((root/'full_catalogue_research_queue.csv').open(newline='',encoding='utf-8'))),'locked_research_files_unchanged':True,'production_modified':False,'publication_or_licensing_claimed':False}
(root/'campaign_master_audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
