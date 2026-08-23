# Job 0 live-checker v2: .NET HttpClient + Task.WhenAll, batches of 50, hard timeouts
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$inputCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck.csv'
$outRaw   = Join-Path $base 'ai-inbox\opencode-recover\livecheck-raw-results.csv'

Add-Type -AssemblyName System.Net.Http
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
$h = New-Object System.Net.Http.HttpClientHandler
$h.AllowAutoRedirect = $true
$h.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = New-Object System.Net.Http.HttpClient($h)
$client.Timeout = [TimeSpan]::FromSeconds(35)
if (-not $client.DefaultRequestHeaders.UserAgent) { [void]$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent', $ua) }
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('Accept-Language','en-MY,en;q=0.9')

$rows = Import-Csv $inputCsv

function Fetch-Text([System.Net.Http.HttpClient]$c, [string]$url) {
    $t = $c.GetAsync($url)
    try { if (-not $t.Wait(38000)) { return [pscustomobject]@{ status='TIMEOUT'; final=''; body=''; err='client timeout 38s' } } } catch { return [pscustomobject]@{ status='ERR'; final=''; body=''; err=$_.Exception.InnerException.Message } }
    $r = $t.Result
    try {
        $st = [int]$r.StatusCode
        $fin = $r.RequestMessage.RequestUri.AbsoluteUri
        if ($r.IsSuccessStatusCode) {
            $bt = $r.Content.ReadAsStringAsync()
            if (-not $bt.Wait(30000)) { return [pscustomobject]@{ status=$st; final=$fin; body=''; err='body timeout' } }
            return [pscustomobject]@{ status=$st; final=$fin; body=$bt.Result; err='' }
        } else { return [pscustomobject]@{ status=$st; final=$fin; body=''; err='' } }
    } finally { $r.Dispose() }
}
function Fetch-Head([System.Net.Http.HttpClient]$c, [string]$url) {
    # GET but only headers+small read to avoid big downloads
    $t = $c.GetAsync($url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead)
    try { if (-not $t.Wait(38000)) { return [pscustomobject]@{ status='TIMEOUT'; ct=''; len=0; err='timeout' } } catch { return [pscustomobject]@{ status='ERR'; ct=''; len=0; err=$_.Exception.InnerException.Message } } }
    $r = $t.Result
    try {
        $ct = ''
        if ($r.Content.Headers.ContentType) { $ct = $r.Content.Headers.ContentType.MediaType }
        $len = 0; if ($r.Content.Headers.ContentLength) { $len = [int]$r.Content.Headers.ContentLength.Value }
        return [pscustomobject]@{ status=[int]$r.StatusCode; ct=$ct; len=$len; err='' }
    } finally { $r.Dispose() }
}

# build token map from worklist detected_model
$wl = Import-Csv (Join-Path $base 'ai-inbox\opencode-recover\remaining-all-worklist.csv')
$wlMap = @{}
foreach ($w in $wl) { $wlMap[[string]$w.source_position + '|' + $w.item_code] = $w }

function Get-Tokens($itemCode, $detectedModel) {
    $toks = New-Object System.Collections.Generic.HashSet[string]
    foreach ($s in (($itemCode -split '-'))) {
        $a = ($s -replace '[^A-Za-z0-9]', '').ToLower()
        if ($a.Length -ge 5 -and $a -match '[a-z]') { [void]$toks.Add($a) }
        $d = ($s -replace '[^0-9]', '')
        if ($d.Length -ge 4) { [void]$toks.Add($d) }
    }
    # joined numeric segments (Bosch style 2608-619-701 -> 2608619701)
    $numjoin = ((($itemCode -split '-') | Select-Object -Skip 1 | Where-Object { $_ -match '^\d+$' }) -join '')
    if ($numjoin.Length -ge 6) { [void]$toks.Add($numjoin.ToLower()) }
    if ($detectedModel) {
        foreach ($m in ($detectedModel -split '[ ,;/]+')) {
            $a = ($m -replace '[^A-Za-z0-9]', '').ToLower()
            if ($a.Length -ge 5) { [void]$toks.Add($a) }
        }
    }
    return @($toks | Where-Object { $_ })
}

$results = New-Object System.Collections.Generic.List[object]
$batchSize = 50
for ($start = 0; $start -lt $rows.Count; $start += $batchSize) {
    $batch = @($rows[$start..([Math]::Min($start + $batchSize - 1, $rows.Count - 1))])
    # fire all page fetches concurrently
    $pageTasks = @{}
    foreach ($r in $batch) { $pageTasks[$r.source_position] = Fetch-Text $client $r.official_product_page }
    # wait: our Fetch-* functions are synchronous wrappers... need async: collect tasks instead
    Write-Host ("batch {0}: pages done" -f $start)
}

Write-Host "NOTE: synchronous fallback used"
