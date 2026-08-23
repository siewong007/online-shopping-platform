import csv,json,hashlib,datetime,re
from pathlib import Path
from collections import Counter
root=Path('/home/ubuntu/work/full_catalogue_image_pass')
master=root/'full_catalogue_campaign_master.csv'; rows=list(csv.DictReader(master.open(newline='',encoding='utf-8')))
assert len(rows)==7771
assert [int(r['source_position']) for r in rows]==list(range(1,7772))
assert Counter(r['campaign_classification'] for r in rows)==Counter({'VERIFIED_CANDIDATE':151,'PENDING':7620})
assert all(r['rights_status_final']=='needs_permission' for r in rows)
assert all(r['coverage_source']!='' and r['coverage_source']!='none' for r in rows)
ledger=root/'full_catalogue_evidence_ledger.csv'; evidence=list(csv.DictReader(ledger.open(newline='',encoding='utf-8')))
for r in evidence:
 p=Path(r['evidence_asset_path']); assert p.exists(); assert hashlib.sha256(p.read_bytes()).hexdigest()==r['evidence_sha256']; assert int(r['identity_confidence'])>=90; assert int(r['image_confidence'])>=90; assert r['rights_status_final']=='needs_permission'
audit=json.loads((root/'campaign_master_audit.json').read_text(encoding='utf-8'))
assert audit['covered_rows']==7771 and audit['uncovered_rows']==0 and audit['queue_rows']==0
candidate_positions=[int(r['source_position']) for r in rows if r['campaign_classification']=='VERIFIED_CANDIDATE']
full_positions=[int(r['source_position']) for r in evidence]
complete=f'''# P1-CAT-01 Full-Catalogue Image Campaign — COMPLETE

## Completion status

> **Coverage status: COMPLETE — 7,771 of 7,771 manifest rows researched and represented in the coverage index.**

The campaign reached the required full-catalogue coverage threshold. The authoritative input manifest remains unchanged. Products 1–2,500 were preserved as locked research outputs; the full-catalogue image pass covered Products 2,501–7,771 in validated shards. No product images were published or imported into production, and no publication or licensing permission is claimed.

## Final statistics

| Measure | Result |
|---|---:|
| Authoritative manifest rows | 7,771 |
| Covered rows | 7,771 |
| Uncovered rows | 0 |
| VERIFIED_CANDIDATE | 151 |
| PENDING | 7,620 |
| REJECTED | 0 |
| Rights status | `needs_permission` for all 7,771 rows |
| Full-pass shards | {audit['full_pass_shards']} |
| Full-pass rows | {audit['full_pass_rows']} |
| Full-pass preserved evidence assets | {len(evidence)} |
| Research queue rows remaining | 0 |

The campaign-level master applies a separate rights gate and records `rights_status_final=needs_permission` on every row. The original source rights metadata remains available in the coverage index under `existing_rights_status`; this preserves the locked source research without rewriting it.

## Evidence preservation

The full-catalogue image pass preserved **{len(evidence)} exact official image assets** with local paths and SHA-256 hashes. Those assets are listed in the evidence ledger and independently rehashed by the final validator. The preserved full-pass candidate positions are:

`{', '.join(map(str,full_positions))}`

The earlier locked candidate research for Products 1–2,500 remains unchanged and is not silently reconstructed or overwritten. Any evidence-preservation action for those locked outputs must continue to use their original research packages and hashes.

## Candidate positions

The complete campaign candidate-position list is recorded in `full_catalogue_campaign_master.csv`. For audit readability, the positions are also listed here:

`{', '.join(map(str,candidate_positions))}`

## Methodology and systemic findings

Research followed the manufacturer-first hierarchy: official Malaysian manufacturer pages, official manufacturer catalogues or PDFs, authorised Malaysian distributor sources, and fail-closed PENDING when exact identity or an exact model-specific image could not be established. Family, sibling, marketplace, and option-family images were not substituted for exact SKU images.

The principal systemic limitation was the low-priority tail of the manifest. From Products 3,801–7,771, the queue contained 3,963 rows without a detected brand and mostly generic or private-label descriptions. These rows were covered and classified PENDING rather than being assigned unsupported images. This is an intentional accuracy safeguard, not a claim that the products do not exist.

The full-pass source checks that produced preserved evidence include the official UNI-T UT33+ series page and model-specific UT33B+ image for Product 3729, plus the earlier recorded official source families in the shard research notes. Example authoritative pages used during the final shard work include [UNI-T UT33+ Series][1], [Cabana CKS330BK][2], [NIETZ product catalogue][3], [Bosch flat chisels][4], and [Sonic Hardware Glotool bolt clipper][5].

## Deliverables

| Deliverable | Absolute path |
|---|---|
| Authoritative manifest | `/home/ubuntu/upload/product-image-manifest.csv` |
| Full coverage index | `/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_coverage_index.csv` |
| Rebuilt research queue | `/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_research_queue.csv` |
| Campaign-level master | `/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_campaign_master.csv` |
| Full-pass evidence ledger | `/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_evidence_ledger.csv` |
| Coverage summary | `/home/ubuntu/work/full_catalogue_image_pass/coverage_index_summary.json` |
| Campaign audit | `/home/ubuntu/work/full_catalogue_image_pass/campaign_master_audit.json` |
| Final validation log | `/home/ubuntu/work/full_catalogue_image_pass/campaign_master_audit.log` |
| Shard outputs and notes | `/home/ubuntu/work/full_catalogue_image_pass/products_<start>_<end>_reviewed.csv` and matching `_research_notes.md` / `_summary.json` files |
| Preserved full-pass assets | `/home/ubuntu/work/full_catalogue_image_pass/assets/<shard_range>/` |
| Research findings | `/home/ubuntu/work/full_catalogue_image_pass/research_findings_3701_3800.md` |
| Processing log | `/home/ubuntu/work/full_catalogue_image_pass/process_remaining_shards.log` |
| Shard validator | `/home/ubuntu/work/full_catalogue_image_pass/validate_range.py` |

## Readiness verdict

> **READY FOR EVIDENCE-PRESERVATION/VALIDATION HANDOFF.**

The coverage index is complete, the campaign-level master validates source order and classification counts, the research queue is empty, and every full-pass preserved candidate asset has a verified SHA-256 hash. Publication/import remains blocked pending separate rights permission and any downstream human or visual review required by the locked campaign specification.

## References

[1]: https://meters.uni-trend.com/product/ut33plus-series/ "UNI-T UT33+ Series Palm Size Multimeters"
[2]: https://www.cabana.com.my/index.php/products/kitchen/kitchen-accessories/cks330bk-detail "Cabana CKS330BK"
[3]: https://nietz.com.my/product-catalogue/ "NIETZ Product Catalogue"
[4]: https://www.boschtools.com/us/en/flat-chisels-43760-ocs-ac/ "Bosch Flat Chisels"
[5]: https://www.sonichardware.com.my/hikashop-menu-for-module-194/product/2951-glotool-bolt-clipper "Sonic Hardware Glotool Bolt Clipper"
'''
(root/'COMPLETE.md').write_text(complete,encoding='utf-8')
summary={'status':'PASS','complete_path':str(root/'COMPLETE.md'),'master_sha256':hashlib.sha256(master.read_bytes()).hexdigest(),'coverage_index_sha256':hashlib.sha256((root/'full_catalogue_coverage_index.csv').read_bytes()).hexdigest(),'evidence_ledger_sha256':hashlib.sha256(ledger.read_bytes()).hexdigest(),'rows':len(rows),'verified_candidate':151,'pending':7620,'rejected':0,'rights_status':'needs_permission for all rows','preserved_full_pass_assets':len(evidence)}
(root/'final_delivery_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8'); print(json.dumps(summary,indent=2))
