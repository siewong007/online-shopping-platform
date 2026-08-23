# AutoCount desktop → website (Price 1 + stock)

Desktop AutoCount cannot be pulled from the VPS. The shop PC **pushes** a file.

Cost is never read. The website updates **Price 1** and **Total Bal. Qty** by Item Code.

## On the website (once)

Set a long random token in `/opt/online-shopping/secrets.env`:

```
AUTOCOUNT_SYNC_TOKEN=<random>
```

Redeploy/recreate the backend so it sees the variable. Endpoint:

`POST https://ekowayhardware.com/api/integrations/autocount/stock-price`  
Header: `Authorization: Bearer <token>`  
Body: CSV text (AutoCount item listing).

If the token is empty, the endpoint returns 503.

## On the AutoCount PC (once)

1. Copy `scripts/autocount-sync/` to `C:\EkowaySync\agent\`.
2. Copy `config.example.ps1` → `config.ps1`. Paste the token. Leave `$ApiUrl` as `https://ekowayhardware.com`.
3. Run `install-task.ps1` as Administrator.
4. Create `C:\EkowaySync\inbox`.

## Every time prices or stock change (or on a timer)

In AutoCount desktop:

1. Stock Item listing / inquiry.
2. Export to Excel (same kind of file as the Price 1 list already used).
3. Required columns: **Item Code**, **Price 1**, **Total Bal. Qty**.  
   Useful extras: **Base UOM**, **Is Active**.  
   **Do not** rely on Last Cost / Standard Cost — the website ignores them.
4. Save as `.csv` (or `.xlsx` if Excel is installed on that PC) into `C:\EkowaySync\inbox`.

The scheduled task uploads the file, then moves it to `done` or `failed`. Logs: `C:\EkowaySync\logs`.

New items that are not already on the website are **skipped** (no category on this export). To add brand-new SKUs, use the full catalogue import in admin.

## Manual test

```powershell
cd C:\EkowaySync\agent
.\ekoway-autocount-sync.ps1 -File C:\EkowaySync\inbox\items.csv
```
