# Push AutoCount desktop Price 1 + stock to ekowayhardware.com.
# Does not read cost. Does not write to AutoCount SQL.
#
# Usage:
#   .\ekoway-autocount-sync.ps1
#   .\ekoway-autocount-sync.ps1 -File "C:\EkowaySync\inbox\items.csv"

param(
    [string]$File = ""
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $here "config.ps1"
if (-not (Test-Path $configPath)) {
    throw "Missing $configPath — copy config.example.ps1 to config.ps1 and set ApiUrl + SyncToken."
}
. $configPath

if ([string]::IsNullOrWhiteSpace($ApiUrl) -or [string]::IsNullOrWhiteSpace($SyncToken)) {
    throw "config.ps1 must set ApiUrl and SyncToken."
}
if (-not $InboxDir) { $InboxDir = "C:\EkowaySync\inbox" }
if (-not $DoneDir) { $DoneDir = "C:\EkowaySync\done" }
if (-not $FailedDir) { $FailedDir = "C:\EkowaySync\failed" }
if (-not $LogDir) { $LogDir = "C:\EkowaySync\logs" }

New-Item -ItemType Directory -Force -Path $InboxDir, $DoneDir, $FailedDir, $LogDir | Out-Null
$log = Join-Path $LogDir ("sync-" + (Get-Date -Format "yyyyMMdd") + ".log")
function Write-Log([string]$msg) {
    $line = "{0} {1}" -f (Get-Date -Format "o"), $msg
    Add-Content -Path $log -Value $line
    Write-Host $line
}

function Convert-XlsxToCsv([string]$xlsxPath) {
    $excel = $null
    $wb = $null
    try {
        $excel = New-Object -ComObject Excel.Application
        $excel.Visible = $false
        $excel.DisplayAlerts = $false
        $wb = $excel.Workbooks.Open($xlsxPath)
        $csvPath = [System.IO.Path]::ChangeExtension($xlsxPath, ".csv")
        $wb.SaveAs($csvPath, 6)
        return $csvPath
    } finally {
        if ($wb) { $wb.Close($false) | Out-Null }
        if ($excel) { $excel.Quit() | Out-Null }
        if ($wb) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) }
        if ($excel) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
        [GC]::Collect()
    }
}

function Get-PendingFiles {
    if ($File) {
        if (-not (Test-Path $File)) { throw "File not found: $File" }
        return @(Get-Item $File)
    }
    $items = @()
    $items += Get-ChildItem -Path $InboxDir -File -Filter *.csv -ErrorAction SilentlyContinue
    $items += Get-ChildItem -Path $InboxDir -File -Filter *.xlsx -ErrorAction SilentlyContinue
    return $items | Sort-Object LastWriteTime
}

$files = @(Get-PendingFiles)
if ($files.Count -eq 0) {
    Write-Log "No CSV/XLSX in $InboxDir"
    exit 0
}

$endpoint = $ApiUrl.TrimEnd("/") + "/api/integrations/autocount/stock-price"

foreach ($item in $files) {
    $work = $item.FullName
    try {
        if ($item.Extension -ieq ".xlsx") {
            Write-Log ("Converting {0}" -f $item.Name)
            $work = Convert-XlsxToCsv $item.FullName
        }
        $csv = [System.IO.File]::ReadAllText($work)
        if ($csv -notmatch "(?i)price\s*1" -and $csv -notmatch "(?i)price_myr") {
            throw "File has no Price 1 column. Export Stock Item from AutoCount with Price 1 and Total Bal. Qty."
        }
        Write-Log ("Uploading {0} ({1} chars)" -f $item.Name, $csv.Length)
        $resp = Invoke-WebRequest -Uri $endpoint -Method POST -ContentType "text/csv; charset=utf-8" -Headers @{ Authorization = "Bearer $SyncToken" } -Body $csv -UseBasicParsing
        Write-Log ("OK {0} {1}" -f $resp.StatusCode, $resp.Content)
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        Move-Item -Force $item.FullName (Join-Path $DoneDir ($stamp + "-" + $item.Name))
        if ($work -ne $item.FullName -and (Test-Path $work)) {
            Remove-Item -Force $work
        }
    } catch {
        Write-Log ("FAIL {0}: {1}" -f $item.Name, $_.Exception.Message)
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        if (Test-Path $item.FullName) {
            Move-Item -Force $item.FullName (Join-Path $FailedDir ($stamp + "-" + $item.Name))
        }
        exit 1
    }
}

exit 0
