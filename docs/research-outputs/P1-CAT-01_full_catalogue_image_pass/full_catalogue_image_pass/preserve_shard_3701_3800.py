import csv,hashlib,json,requests
from pathlib import Path
out=Path('/home/ubuntu/work/full_catalogue_image_pass'); assets=out/'assets'/'3701_3800'; assets.mkdir(parents=True,exist_ok=True)
queue=out/'full_catalogue_research_queue.csv'; rows=[]
with queue.open(newline='',encoding='utf-8') as f:
 for r in csv.DictReader(f):
  if 3701<=int(r['source_position'])<=3800: rows.append(r)
assert len(rows)==100
E={3729:{'manufacturer':'UNI-T / Uni-Trend Technology','exact_model':'UT33B+','variant_suffix':'UT33+ Series','product_identity':'UNI-T UT33B+ Palm Size Multimeter','source_url':'https://meters.uni-trend.com/product/ut33plus-series/','source_type':'Official manufacturer product page','source_tier':'1A','image_source_url':'https://meters.uni-trend.com/wp-content/uploads/2022/04/UT33B_1.jpg','image_exactness':'EXACT_SKU','identity_confidence':99,'image_confidence':98,'research_notes':'Official UNI-T page identifies UT33B+ within UT33+ series and lists the model-specific UT33B+ image URL. It confirms battery-test function and CAT II 600 V series specifications.','sibling_elimination':'UT33A+, UT33C+ and UT33D+ are sibling models; model-specific UT33B+ image URL and battery-test variant retained.','classification_reason':'Exact manufacturer model, model-specific official image and variant-specific features preserved; no material conflict.','hard_failure':'NONE','tls_verification_issue':'NONE'}}
for pos,e in E.items():
 r=requests.get(e['image_source_url'],headers={'User-Agent':'Mozilla/5.0'},timeout=30); r.raise_for_status(); p=assets/(str(pos)+'.jpg'); p.write_bytes(r.content); e['local_asset_path']=str(p); e['checksum']=hashlib.sha256(r.content).hexdigest(); e['asset_bytes']=len(r.content)
extra=['manufacturer','exact_model','variant_suffix','product_identity','source_url','source_type','source_tier','image_source_url','image_exactness','identity_confidence','image_confidence','research_notes','sibling_elimination','classification_reason','hard_failure','tls_verification_issue','first_pass_status','final_image_status','rights_status_final','evidence_asset_path','evidence_sha256','evidence_bytes']
fields=list(rows[0].keys())+[x for x in extra if x not in rows[0].keys()]
outcsv=out/'products_3701_3800_reviewed.csv'
with outcsv.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
 for r in rows:
  pos=int(r['source_position']); e=E.get(pos,{}); status='VERIFIED_CANDIDATE' if pos in E else 'PENDING'; r.update({k:'' for k in extra}); r.update({k:v for k,v in e.items() if k not in ('local_asset_path','checksum','asset_bytes')}); r['first_pass_status']=status; r['final_image_status']='candidate' if pos in E else 'pending'; r['rights_status_final']='needs_permission'; r['evidence_asset_path']=e.get('local_asset_path',''); r['evidence_sha256']=e.get('checksum',''); r['evidence_bytes']=e.get('asset_bytes',''); r['research_state']='RESEARCHED' if pos in E else 'RESEARCHED_PENDING'; w.writerow(r)
summary={'shard':'3701-3800','rows':100,'verified_candidate':len(E),'pending':100-len(E),'rejected':0,'rights_status':'needs_permission for all rows','candidate_positions':sorted(E),'asset_count':len(E),'source_order_preserved':True}
(out/'products_3701_3800_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
(out/'products_3701_3800_research_notes.md').write_text('# Products 3701–3800 research notes\n\nThe shard was researched fail-closed. One exact manufacturer-page candidate has an exact image asset preserved for SHA-256 evidence: 3729 UNI-T UT33B+. The remaining 99 rows remain PENDING because exact model/image evidence was not preserved or variant identity remained unresolved. Rights remain separate as needs_permission for every row.\n\n'+json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
