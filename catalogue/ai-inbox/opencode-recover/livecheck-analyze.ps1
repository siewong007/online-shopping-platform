# Job 0 analysis: dedupe raw, token-check pages, emit verified CSV
$ErrorActionPreference = 'Stop'
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$rawPath = Join-Path $base 'ai-inbox\opencode-recover\livecheck-raw-results.csv'
$cacheDir = Join-Path $base 'ai-inbox\opencode-recover\pagecache'
$outCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck-verified.csv'
$inputCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck.csv'
$worklist = Join-Path $base 'ai-inbox\opencode-recover\remaining-all-worklist.csv'

# dedupe raw
$raw = Import-Csv $rawPath
$seen = @{}; $dedup = New-Object System.Collections.Generic.List[object]
foreach ($r in $raw) { if (-not $seen.ContainsKey([string]$r.source_position)) { $seen[[string]$r.source_position]=$true; $dedup.Add($r) } }
Write-Host ("distinct checked rows: {0}" -f $dedup.Count)
$map = @{}
foreach ($r in $dedup) { $map[[string]$r.source_position] = $r }

$rows = @(Import-Csv $inputCsv)
$wl = Import-Csv $worklist
$wlMap = @{}
foreach ($w in $wl) { $wlMap[[string]$w.source_position] = $w }

function Get-Tokens($itemCode, $detectedModel) {
    $toks = New-Object System.Collections.Generic.HashSet[string]
    foreach ($s in (($itemCode -split '-'))) {
        $a = ($s -replace '[^A-Za-z0-9]', '').ToLower()
        if ($a.Length -ge 5 -and $a -match '[a-z]') { [void]$toks.Add($a) }
    }
    $numjoin = ((($itemCode -split '-') | Select-Object -Skip 1 | Where-Object { $_ -match '^\d+$' }) -join '')
    if ($numjoin.Length -ge 6) { [void]$toks.Add($numjoin.ToLower()) }
    if ($detectedModel) {
        foreach ($m in (($detectedModel -split '[ ,;/xX]+'))) {
            $a = ($m -replace '[^A-Za-z0-9]', '').ToLower()
            if ($a.Length -ge 5) { [void]$toks.Add($a) }
        }
    }
    return @($toks | Where-Object { $_ -and $_.Length -ge 5 })
}

$out = New-Object System.Collections.Generic.List[object]
foreach ($r in $rows) {
    $pos = [string]$r.source_position
    $chk = $map[$pos]
    $w = $wlMap[$pos]
    $dm = $null; if ($w) { $dm = $w.detected_model }
    $tokens = Get-Tokens $r.item_code $dm

    $pageOk = $false; $imgOk = $false; $tokenHit = ''; $reasonBits = @()
    if ($chk) {
        if ("$($chk.page_status)" -eq '200') { $pageOk = $true } else { $reasonBits += ("page:{0}" -f $chk.page_status) }
        $ct = "$($chk.img_ct)"
        if ("$($chk.img_status)" -eq '200' -and $ct -match '^image/') { $imgOk = $true } else { $reasonBits += ("image:{0} ct={1}" -f $chk.img_status, $ct) }
        # token search in cached flattened page + image filename/url
        $cacheFile = Join-Path $cacheDir ("{0}.txt" -f $pos)
        $flat = ''
        if (Test-Path $cacheFile) { $flat = Get-Content $cacheFile -Raw }
        $hay = $flat
        try { $hay += ($chk.page_final.ToLower() -replace '[^a-z0-9]','') } catch { }
        try { $hay += ($r.official_image_url.ToLower() -replace '[^a-z0-9]','') } catch { }
        foreach ($t in $tokens) { if ($hay.Contains($t)) { $tokenHit = $t; break } }
        if (-not $tokenHit -and $tokens.Count -gt 0) { $reasonBits += ('model-token-not-on-page:[' + ($tokens -join ',') + ']') }
    } else { $reasonBits += 'not-checked' }

    $decision = 'pass'; $human = 'none'
    if (-not $pageOk -or -not $imgOk -or ($tokens.Count -gt 0 -and -not $tokenHit)) {
        $decision = 'fail'; $human = 'requeue_search'
    }
    $out.Add([pscustomobject]@{
        source_position = $pos
        item_code = $r.item_code
        uom = $r.uom
        display_name = $r.display_name
        prior_status = $r.prior_source
        opencode_decision = $decision
        finish_exact = ''
        model_exact = ''
        url_live = $(if ($pageOk) {'yes'} else {'no'})
        source_ok = $(if ($imgOk) {'yes'} else {'no'})
        official_product_page = $r.official_product_page
        official_image_url = $r.official_image_url
        local_asset_path = $r.local_asset_path
        rights_status = $r.rights_status
        reason = $(if ($decision -eq 'pass') {"live ok; model token [$tokenHit] on page"} else { ($reasonBits -join '; ') })
        human_action = $human
    })
}
$out | Export-Csv -NoTypeInformation -Encoding UTF8 $outCsv
$p = @($out | Where-Object { $_.opencode_decision -eq 'pass' }).Count
$f = @($out | Where-Object { $_.opencode_decision -eq 'fail' }).Count
Write-Host ("VERIFIED WRITTEN: pass={0} fail={1} total={2}" -f $p, $f, $out.Count)
