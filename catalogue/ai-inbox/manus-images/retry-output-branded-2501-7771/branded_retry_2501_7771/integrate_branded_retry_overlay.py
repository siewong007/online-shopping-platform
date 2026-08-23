import csv,json,hashlib
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass'); retry=Path('/home/ubuntu/work/retry_branded_2501_7771/retry_queue_branded_2501_7771_reviewed.csv')
master=root/'full_catalogue_campaign_master.csv'; base=list(csv.DictReader(master.open(newline='',encoding='utf-8'))); rr=list(csv.DictReader(retry.open(newline='',encoding='utf-8')))
by={int(r['source_position']):r for r in rr}; assert len(by)==2838
outrows=[]
for r in base:
 pos=int(r['source_position'])
 if pos in by:
  x=by[pos]; r['campaign_classification']=x['first_pass_status']; r['rights_status_final']='needs_permission'; r['evidence_ready']='YES' if x['first_pass_status']=='VERIFIED_CANDIDATE' else 'NO'; r['campaign_notes']='Branded/model retry overlay: '+('exact authoritative image evidence preserved and hash-validated.' if x['first_pass_status']=='VERIFIED_CANDIDATE' else 'retry researched fail-closed to PENDING; no exact image evidence preserved.')
 outrows.append(r)
fields=list(outrows[0].keys()); overlay=root/'full_catalogue_campaign_master_after_branded_retry.csv'
with overlay.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(outrows)
# Build a combined evidence ledger from prior full-pass evidence plus retry candidates.
baseledger=root/'full_catalogue_evidence_ledger.csv'; prior=list(csv.DictReader(baseledger.open(newline='',encoding='utf-8'))); retrycand=[r for r in rr if r['first_pass_status']=='VERIFIED_CANDIDATE']; lf=list(prior[0].keys()) if prior else ['source_position']
combined={int(r['source_position']):r for r in prior}
for r in retrycand: combined[int(r['source_position'])]={k:r.get(k,'') for k in lf}
ledger=root/'full_catalogue_evidence_ledger_after_branded_retry.csv'
with ledger.open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=lf); w.writeheader()
 for pos in sorted(combined): w.writerow(combined[pos])
classes=Counter(r['campaign_classification'] for r in outrows); assert classes==Counter({'VERIFIED_CANDIDATE':161,'PENDING':7610})
assert all(r['rights_status_final']=='needs_permission' for r in outrows)
summary={'status':'PASS','base_master':str(master),'overlay_master':str(overlay),'rows':len(outrows),'verified_candidate':classes['VERIFIED_CANDIDATE'],'pending':classes['PENDING'],'rejected':classes['REJECTED'],'retry_rows':len(rr),'retry_candidates':len(retrycand),'combined_evidence_rows':len(combined),'locked_master_modified':False,'rights_status':'needs_permission for all rows'}
(root/'branded_retry_overlay_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
(root/'branded_retry_overlay_notes.md').write_text('# Branded/model retry overlay\n\nThe validated retry output is integrated into a separate campaign-master overlay. The original full_catalogue_campaign_master.csv remains unchanged. Only the 2,838 positions supplied by the retry list are overlaid; all other rows and locked source outputs are preserved. Rights remain `needs_permission` for every row.\n\n```json\n'+json.dumps(summary,indent=2)+'\n```\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
