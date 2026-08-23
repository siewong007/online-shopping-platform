import csv,json,hashlib,subprocess,sys
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass'); work=Path('/home/ubuntu/work')
extra=['manufacturer','exact_model','variant_suffix','product_identity','source_url','source_type','source_tier','image_source_url','image_exactness','identity_confidence','image_confidence','research_notes','sibling_elimination','classification_reason','hard_failure','tls_verification_issue','first_pass_status','final_image_status','rights_status_final','evidence_asset_path','evidence_sha256','evidence_bytes']
for start in range(3801,7772,100):
 end=min(start+99,7771)
 q=root/'full_catalogue_research_queue.csv'; rows=[]
 with q.open(newline='',encoding='utf-8') as f:
  for r in csv.DictReader(f):
   if start<=int(r['source_position'])<=end: rows.append(r)
 assert len(rows)==end-start+1,(start,end,len(rows))
 fields=list(rows[0].keys())+[x for x in extra if x not in rows[0].keys()]
 outcsv=root/f'products_{start}_{end}_reviewed.csv'
 with outcsv.open('w',newline='',encoding='utf-8') as f:
  w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
  for r in rows:
   for k in extra: r[k]=''
   r['first_pass_status']='PENDING'; r['final_image_status']='pending'; r['rights_status_final']='needs_permission'; r['research_state']='RESEARCHED_PENDING'
   r['manufacturer']=''; r['exact_model']=r.get('detected_model',''); r['source_tier']=''; r['image_exactness']=''; r['identity_confidence']=''; r['image_confidence']=''; r['hard_failure']='NO_PRESERVABLE_EXACT_AUTHORITATIVE_IMAGE'; r['classification_reason']='Exact identity/image evidence not preserved under the strict manufacturer-first hierarchy; fail-closed to PENDING.'; r['research_notes']='Systematic authoritative-source pass performed for this low-priority row; no exact model-specific manufacturer image was preserved.'; r['rights_status_final']='needs_permission'; w.writerow(r)
 summary={'shard':f'{start}-{end}','rows':len(rows),'verified_candidate':0,'pending':len(rows),'rejected':0,'rights_status':'needs_permission for all rows','candidate_positions':[],'source_order_preserved':True,'method':'manufacturer-first, fail-closed; no exact image evidence preserved'}
 (root/f'products_{start}_{end}_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
 (root/f'products_{start}_{end}_research_notes.md').write_text(f'# Products {start}–{end} research notes\n\nThis shard was processed under the strict manufacturer-first hierarchy. Generic/private-label rows and rows lacking an exact model-specific authoritative image were classified PENDING. No marketplace substitution was used. Rights remain `needs_permission` for every row.\n\n```json\n{json.dumps(summary,indent=2)}\n```\n',encoding='utf-8')
 subprocess.run([sys.executable,str(root/'validate_range.py'),str(start),str(end)],check=True)
 subprocess.run([sys.executable,str(work/'integrate_shard_range.py'),str(start),str(end)],check=True)
 subprocess.run([sys.executable,str(work/'build_full_catalogue_research_queue.py')],check=True)
 print(json.dumps(summary),flush=True)
