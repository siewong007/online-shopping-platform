# Job 0 live-checker v3: true concurrent HttpClient tasks
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "C:\Users\DELL\OneDrive\Desktop\ekoway hardware website\online-shopping-platform\catalogue"
$inputCsv = Join-Path $base 'ai-inbox\opencode-verify\already-pass-livecheck.csv'
$outRaw   = Join-Path $base 'ai-inbox\opencode-recover\livecheck-raw-results.csv'

Add-Type -AssemblyName System.Net.Http
$h = New-Object System.Net.Http.HttpClientHandler
$h.AllowAutoRedirect = $true
$h.AutomaticDecompression = [System.Net.DecompressionMethods]::GZip -bor [System.Net.DecompressionMethods]::Deflate
$client = New-Object System.Net.Http.HttpClient($h)
$client.Timeout = [TimeSpan]::FromSeconds(60)
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
[void]$client.DefaultRequestHeaders.TryAddWithoutValidation('Accept-Language','en-MY,en;q=0.9')

$rows = @(Import-Csv $inputCsv)

function Wait-Tasks($tasksDict, $ms) {
    $arr = @($tasksDict.Values)
    if ($arr.Count -eq 0) { return }
    try { [void][System.Threading.Tasks.Task]::WaitAll($arr, $ms) } catch { Write-Host "waitall fault: $($_.Exception.Message)" }
}

$results = New-Object System.Collections.Generic.List[object]
$batchSize = 50
for ($start = 0; $start -lt $rows.Count; $start += $batchSize) {
    $batch = @($rows[$start..([Math]::Min($start + $batchSize - 1, $rows.Count - 1))])

    # 1) fire page GETs concurrently
    $pt = @{}
    foreach ($r in $batch) {
        if ([string]::IsNullOrWhiteSpace($r.official_product_page)) { continue }
        try { $pt[$r.source_position] = $client.GetAsync($r.official_product_page) } catch { Write-Host ("bad page url pos {0}: {1}" -f $r.source_position, $_.Exception.Message) }
    }
    Wait-Tasks $pt 50000

    # 2) fire body reads concurrently for succeeded pages
    $bt = @{}
    foreach ($k in $pt.Keys) {
        $t = $pt[$k]
        if ($t.IsCompleted -and $t.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion -and $t.Result.IsSuccessStatusCode) {
            $bt[$k] = $t.Result.Content.ReadAsStringAsync()
        }
    }
    Wait-Tasks $bt 40000

    # 3) fire image GETs concurrently (headers read)
    $it = @{}
    foreach ($r in $batch) {
        if ($r.official_image_url) {
            try { $it[$r.source_position] = $client.GetAsync($r.official_image_url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead) } catch { }
        }
    }
    Wait-Tasks $it 50000

    # collect
    foreach ($r in $batch) {
        $o = [pscustomobject]@{
            source_position=$r.source_position; item_code=$r.item_code; uom=$r.uom;
            page_status=''; page_final=''; page_len=0; img_status=''; img_ct=''; img_len=0; errs=''
        }
        if ($pt.ContainsKey($r.source_position)) {
            $t = $pt[$r.source_position]
            if ($t.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                $resp = $t.Result
                $o.page_status = [int]$resp.StatusCode
                try { $o.page_final = $resp.RequestMessage.RequestUri.AbsoluteUri } catch { }
                if ($resp.Content.Headers.ContentLength) { $o.page_len = [int]$resp.Content.Headers.ContentLength.Value }
                if ($bt.ContainsKey($r.source_position) -and $bt[$r.source_position].Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                    $body = $bt[$r.source_position].Result
                    if (-not $o.page_len) { $o.page_len = $body.Length }
                    # store flattened body hash-check tokens later; keep first 200KB
                    $flat = ($body.ToLower() -replace '[^a-z0-9]', '')
                    Set-Content -LiteralPath ("{0}\pagecache\{1}.txt" -f (Join-Path $base 'ai-inbox\opencode-recover'), $r.source_position) -Value $flat -Encoding UTF8
                }
                $resp.Dispose()
            } elseif ($t.IsFaulted) {
                $e = $t.Exception.GetBaseException()
                $o.errs = ('PAGE:' + $e.Message)
            } else { $o.errs = 'PAGE:timeout/cancelled' }
        } else { $o.errs = 'PAGE:no-url' }
        if ($it.ContainsKey($r.source_position)) {
            $t2 = $it[$r.source_position]
            if ($t2.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion) {
                $resp2 = $t2.Result
                $o.img_status = [int]$resp2.StatusCode
                if ($resp2.Content.Headers.ContentType) { $o.img_ct = $resp2.Content.Headers.ContentType.MediaType }
                if ($resp2.Content.Headers.ContentLength) { $o.img_len = [int]$resp2.Content.Headers.ContentLength.Value }
                $resp2.Dispose()
            } elseif ($t2.IsFaulted) {
                $e2 = $t2.Exception.GetBaseException()
                $o.errs = ($o.errs + ' IMG:' + $e2.Message)
            } else { $o.errs = ($o.errs + ' IMG:timeout') }
        }
        $results.Add($o)
    }
    Write-Host ("batch done through source_position {0} ({1}/{2})" -f $batch[-1].source_position, ([Math]::Min($start+$batchSize,$rows.Count)), $rows.Count)
}
$client.Dispose()

$results | Export-Csv -NoTypeInformation -Encoding UTF8 $outRaw
Write-Host ("RAW WRITTEN: {0} rows" -f $results.Count)
