# Job 0 live-checker v4: concurrent HttpClient, connection-limit fixed, resumable, per-batch flush
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
[System.Net.ServicePointManager]::DefaultConnectionLimit = 200
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$inputCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck.csv'
$outRaw   = Join-Path $base 'ai-inbox\opencode-recover\livecheck-raw-results.csv'
$cacheDir = Join-Path $base 'ai-inbox\opencode-recover\pagecache'

Add-Type -AssemblyName System.Net.Http
$h = New-Object System.Net.Http.HttpClientHandler
$h.AllowAutoRedirect = $true
$h.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$h.MaxResponseContentBufferSize = 8MB
$client = New-Object System.Net.Http.HttpClient($h)
$client.Timeout = [TimeSpan]::FromSeconds(25)
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('Accept-Language','en-MY,en;q=0.9')

$rowsAll = @(Import-Csv $inputCsv)
# resume: skip source_positions already in partial raw
$done = @{}
if (Test-Path $outRaw) {
    foreach ($p in (Import-Csv $outRaw)) { $done[[string]$p.source_position] = $true }
    Write-Host ("resuming: {0} already checked" -f $done.Count)
}
$rows = @($rowsAll | Where-Object { -not $done.ContainsKey([string]$_.source_position) })
Write-Host ("to check: {0}" -f $rows.Count)

function Wait-Tasks($tasksDict, $ms, $stage) {
    $arr = @($tasksDict.Values)
    if ($arr.Count -eq 0) { return }
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try { [void][System.Threading.Tasks.Task]::WaitAll($arr, $ms) } catch { }
    Write-Host ("  stage {0}: {1} tasks, waited {2}ms" -f $stage, $arr.Count, $sw.ElapsedMilliseconds)
}

$results = New-Object System.Collections.Generic.List[object]
$batchSize = 40
for ($start = 0; $start -lt $rows.Count; $start += $batchSize) {
    $batch = @($rows[$start..([Math]::Min($start + $batchSize - 1, $rows.Count - 1))])
    Write-Host ("batch start pos {0} ({1})" -f $batch[0].source_position, (Get-Date -Format HH:mm:ss))

    $pt = @{}
    foreach ($r in $batch) {
        if ([string]::IsNullOrWhiteSpace($r.official_product_page)) { continue }
        try { $pt[$r.source_position] = $client.GetAsync($r.official_product_page) } catch { Write-Host ("bad page url pos {0}" -f $r.source_position) }
    }
    Wait-Tasks $pt 30000 'pages'

    $bt = @{}
    foreach ($k in @($pt.Keys)) {
        $t = $pt[$k]
        if ($t.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
            try {
                if ($t.Result.IsSuccessStatusCode) { $bt[$k] = $t.Result.Content.ReadAsStringAsync() }
            } catch { }
        }
    }
    Wait-Tasks $bt 25000 'bodies'

    $it = @{}
    foreach ($r in $batch) {
        if ([string]::IsNullOrWhiteSpace($r.official_image_url)) { continue }
        try { $it[$r.source_position] = $client.GetAsync($r.official_image_url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead) } catch { }
    }
    Wait-Tasks $it 30000 'images'

    foreach ($r in $batch) {
        $o = [pscustomobject]@{
            source_position=$r.source_position; item_code=$r.item_code; uom=$r.uom;
            page_status=''; page_final=''; page_len=0; img_status=''; img_ct=''; img_len=0; errs=''
        }
        if ($pt.ContainsKey($r.source_position)) {
            $t = $pt[$r.source_position]
            if ($t.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                try {
                    $resp = $t.Result
                    $o.page_status = [int]$resp.StatusCode
                    try { $o.page_final = $resp.RequestMessage.RequestUri.AbsoluteUri } catch { }
                    if ($resp.Content.Headers.ContentLength) { $o.page_len = [int]$resp.Content.Headers.ContentLength.Value }
                    if ($bt.ContainsKey($r.source_position) -and $bt[$r.source_position].Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                        $body = $bt[$r.source_position].Result
                        if (-not $o.page_len) { $o.page_len = $body.Length }
                        $flat = ($body.ToLower() -replace '[^a-z0-9]', '')
                        Set-Content -LiteralPath (Join-Path $cacheDir ("{0}.txt" -f $r.source_position)) -Value $flat -Encoding UTF8
                    }
                    $resp.Dispose()
                } catch { $o.errs = ('PAGE:' + $_.Exception.Message) }
            } elseif ($t.IsFaulted) { $o.errs = ('PAGE:' + $t.Exception.GetBaseException().Message) }
            else { $o.errs = 'PAGE:timeout' }
        } else { $o.errs = 'PAGE:no-url' }
        if ($it.ContainsKey($r.source_position)) {
            $t2 = $it[$r.source_position]
            if ($t2.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                try {
                    $resp2 = $t2.Result
                    $o.img_status = [int]$resp2.StatusCode
                    if ($resp2.Content.Headers.ContentType) { $o.img_ct = $resp2.Content.Headers.ContentType.MediaType }
                    if ($resp2.Content.Headers.ContentLength) { $o.img_len = [int]$resp2.Content.Headers.ContentLength.Value }
                    $resp2.Dispose()
                } catch { $o.errs = ($o.errs + ' IMG:' + $_.Exception.Message) }
            } elseif ($t2.IsFaulted) { $o.errs = ($o.errs + ' IMG:' + $t2.Exception.GetBaseException().Message) }
            else { $o.errs = ($o.errs + ' IMG:timeout') }
        }
        $results.Add($o)
    }
    # flush per batch (append)
    $results | Export-Csv -NoTypeInformation -Encoding UTF8 -Append $outRaw
    Write-Host ("batch flushed through pos {0}; cumulative file rows: {1}" -f $batch[-1].source_position, ((Import-Csv $outRaw | Measure-Object).Count))
}
$client.Dispose()
Write-Host ("LIVECHECK FETCH DONE: total rows in raw: {0}" -f ((Import-Csv $outRaw | Measure-Object).Count))
