# Retry cohort: saniware via http, kaercher follow 308
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::DefaultConnectionLimit = 100
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$ver = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck-verified.csv'
$cacheDir = Join-Path $base 'ai-inbox\opencode-recover\pagecache'
$rows = @(Import-Csv $ver | Where-Object { $_.opencode_decision -eq 'fail' -and $_.reason -match '^page:' })
Write-Host ("retrying {0} rows" -f $rows.Count)

foreach ($r in $rows) {
    $u = $r.official_product_page
    if ($u -match '^https://saniware\.com') { $u = $u -replace '^https://', 'http://' }
    try {
        $p = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 6 -UserAgent 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
        $pageOk = ($p.StatusCode -eq 200)
        $flat = ''
        if ($pageOk -and $p.Content) { $flat = ($p.Content.ToLower() -replace '[^a-z0-9]', '') }
        # image check
        $imgOk = $false; $ct = ''
        try {
            $i = Invoke-WebRequest -Uri $r.official_image_url -UseBasicParsing -TimeoutSec 30 -MaximumRedirection 6 -UserAgent 'Mozilla/5.0' -Method Get
            $ct = "$($i.Headers['Content-Type'])"
            if ([int]$i.StatusCode -eq 200 -and $ct -match '^image/') {
                $imgOk = $true
                $flat += (($r.official_image_url.ToLower()) -replace '[^a-z0-9]','')
            }
        } catch { }
        Set-Content -LiteralPath (Join-Path $cacheDir ("{0}.txt" -f $r.source_position)) -Value $flat -Encoding UTF8
        Write-Host ("pos {0} {1}: page={2} img_ok={3}" -f $r.source_position, $r.item_code, $p.StatusCode, $imgOk)
    } catch {
        Write-Host ("pos {0} {1}: PAGE ERR {2}" -f $r.source_position, $r.item_code, $_.Exception.Message.Substring(0,[Math]::Min(80,$_.Exception.Message.Length)))
    }
}
