# Branded/model retry overlay

The validated retry output is integrated into a separate campaign-master overlay. The original full_catalogue_campaign_master.csv remains unchanged. Only the 2,838 positions supplied by the retry list are overlaid; all other rows and locked source outputs are preserved. Rights remain `needs_permission` for every row.

```json
{
  "status": "PASS",
  "base_master": "/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_campaign_master.csv",
  "overlay_master": "/home/ubuntu/work/full_catalogue_image_pass/full_catalogue_campaign_master_after_branded_retry.csv",
  "rows": 7771,
  "verified_candidate": 161,
  "pending": 7610,
  "rejected": 0,
  "retry_rows": 2838,
  "retry_candidates": 10,
  "combined_evidence_rows": 21,
  "locked_master_modified": false,
  "rights_status": "needs_permission for all rows"
}
```
