# Job 0 live-checker: fetch page + image for each row concurrently (runspace pool, batches of 50)
param()
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$inputCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck.csv'
$worklist = Join-Path $base 'ai-inbox\opencode-recover\remaining-all-worklist.csv'
$outRaw   = Join-Path $base 'ai-inbox\opencode-recover\livecheck-raw-results.csv'

$rows = Import-Csv $inputCsv
$wl = Import-Csv $worklist
$wlMap = @{}
foreach ($w in $wl) { $wlMap[$w.source_position + '|' + $w.item_code + '|' + $w.uom] = $w }

function Get-Tokens($itemCode, $detectedModel) {
    $toks = New-Object System.Collections.Generic.HashSet[string]
    $segs = ($itemCode -split '-')
    # candidate 1: join numeric-ish segments after brand prefix
    $rest = ($segs | Select-Object -Skip 1) -join ''
    $digits = ($rest -replace '[^A-Za-z0-9]', '')
    if ($digits.Length -ge 6) { [void]$toks.Add($digits.ToLower()) }
    # candidate 2: each alpha-containing segment (e.g. YTA60Z1, SL30IP)
    foreach ($s in $segs) {
        $a = ($s -replace '[^A-Za-z0-9]', '')
        if ($a.Length -ge 5 -and $a -match '[A-Za-z]') { [void]$toks.Add($a.ToLower()) }
    }
    if ($detectedModel) {
        foreach ($m in ($detectedModel -split '[ ,;/]+')) {
            $a = ($m -replace '[^A-Za-z0-9]', '')
            if ($a.Length -ge 5) { [void]$toks.Add($a.ToLower()) }
        }
    }
    return @($toks)
}

# annotate rows with tokens
$annotated = foreach ($r in $rows) {
    $key = $r.source_position + '|' + $r.item_code + '|' + $r.uom
    $w = $wlMap[$key]
    $dm = $null; if ($w) { $dm = $w.detected_model }
    [pscustomobject]@{
        source_position = $r.source_position; item_code = $r.item_code; uom = $r.uom
        display_name = $r.display_name; prior_source = $r.prior_source
        official_product_page = $r.official_product_page; official_image_url = $r.official_image_url
        local_asset_path = $r.local_asset_path; rights_status = $r.rights_status
        tokens = (Get-Tokens $r.item_code $dm) -join ';'
    }
}

$worker = @'
param($obj)
$output = [pscustomobject]@{
    source_position=$obj.source_position; item_code=$obj.item_code; uom=$obj.uom;
    page_status=''; page_final_url=''; page_len=0; page_token_hit='';
    img_status=''; img_ct=''; img_len=0; img_err=''; page_err=''
}
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
try {
    $p = Invoke-WebRequest -Uri $obj.official_product_page -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 5 -Headers @{ 'User-Agent' = $ua }
    $output.page_status = [int]$p.StatusCode
    $output.page_final_url = $p.BaseResponse.ResponseUri.AbsoluteUri
    $html = $p.Content
    if ($html) { $output.page_len = $html.Length }
    $flat = ''
    if ($html) { $flat = ($html.ToLower() -replace '[^a-z0-9]', '') }
    $hits = @()
    foreach ($t in ($obj.tokens -split ';' | Where-Object { $_ })) {
        if ($flat.Contains($t)) { $hits += $t }
    }
    $output.page_token_hit = ($hits -join ';')
} catch {
    $msg = $_.Exception.Message
    if ($_.Exception.Response) { $output.page_status = [int]$_.Exception.Response.StatusCode }
    $output.page_err = ($msg -replace '[\r\n,]', ' ').Substring(0, [Math]::Min(120, $msg.Length))
}
if ($obj.official_image_url) {
    try {
        $i = Invoke-WebRequest -Uri $obj.official_image_url -UseBasicParsing -TimeoutSec 25 -MaximumRedirection 5 -Headers @{ 'User-Agent' = $ua }
        $output.img_status = [int]$i.StatusCode
        $ct = $i.Headers['Content-Type']; if (-not $ct -and $i.BaseResponse) { $ct = $i.BaseResponse.ContentType }
        $output.img_ct = "$ct"
        if ($i.RawContentLength) { $output.img_len = $i.RawContentLength } elseif ($i.Content) { $output.img_len = $i.Content.Length }
    } catch {
        $msg = $_.Exception.Message
        if ($_.Exception.Response) { $output.img_status = [int]$_.Exception.Response.StatusCode }
        $output.img_err = ($msg -replace '[\r\n,]', ' ').Substring(0, [Math]::Min(120, $msg.Length))
    }
}
return $output
'@

$pool = [runspacefactory]::CreateRunspacePool(1, 24, [initialsessionstate]::CreateDefault(), $Host)
$pool.Open()
$results = New-Object System.Collections.Generic.List[object]
$batchSize = 50
for ($start = 0; $start -lt $annotated.Count; $start += $batchSize) {
    $batch = $annotated[$start..([Math]::Min($start + $batchSize - 1, $annotated.Count - 1))]
    $jobs = @()
    foreach ($row in $batch) {
        $ps = [powershell]::Create(); $ps.RunspacePool = $pool
        [void]$ps.AddScript($worker).AddArgument($row)
        $jobs += [pscustomobject]@{ PS = $ps; Handle = $ps.BeginInvoke() }
    }
    foreach ($j in $jobs) {
        try { $results.Add(($j.PS.EndInvoke($j.Handle) | Select-Object -First 1)) }
        catch { Write-Warning "job failed: $($_.Exception.Message)" }
        finally { $j.PS.Dispose() }
    }
    Write-Host ("batch done: {0}/{1}" -f ([Math]::Min($start + $batchSize, $annotated.Count)), $annotated.Count)
}
$pool.Close()

$results | Export-Csv -NoTypeInformation -Encoding UTF8 $outRaw
Write-Host ("RAW WRITTEN: {0} rows -> {1}" -f $results.Count, $outRaw)
