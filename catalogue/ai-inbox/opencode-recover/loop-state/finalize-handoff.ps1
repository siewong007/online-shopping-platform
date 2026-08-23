# Finalize the image-loop handoff after all nine OpenCode chats are stopped.
#
#   powershell -ExecutionPolicy Bypass -File catalogue\ai-inbox\opencode-recover\loop-state\finalize-handoff.ps1
#
# Re-consolidates every chat ledger into loop-ledger.csv, commits the delta, and
# pushes. Safe to run more than once: consolidate.py only moves rows forward.

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path "$PSScriptRoot\..\..\..\..").Path
Set-Location $repo
Write-Host "repo: $repo" -ForegroundColor Cyan

# 1. Warn if the chats are still writing -- a snapshot taken mid-write is inconsistent.
$busy = Get-ChildItem "catalogue\ai-inbox\opencode-recover\loop-state" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-3) -and $_.FullName -notmatch 'pagecache|__pycache__' }
if ($busy) {
    Write-Host "$($busy.Count) files changed in the last 3 minutes - chats may still be running." -ForegroundColor Yellow
    $answer = Read-Host "Continue anyway? (y/N)"
    if ($answer -ne 'y') { Write-Host "Stopped. Close the chats, then re-run."; exit 1 }
}

# 2. Consolidate all nine chat ledgers into the single resume point.
Write-Host "`nconsolidating..." -ForegroundColor Cyan
python catalogue\ai-inbox\opencode-recover\loop-state\consolidate.py
if ($LASTEXITCODE -ne 0) { throw "consolidate.py failed" }

# 3. Stage everything except the file OneDrive keeps locked.
git add -A -- . ':!scripts/autocount-sync/install-task.ps1'

if (-not (git diff --cached --name-only)) {
    Write-Host "`nnothing new to commit." -ForegroundColor Green
} else {
    $n = (git diff --cached --name-only | Measure-Object -Line).Lines
    $state = python -c "import csv,collections;r=list(csv.DictReader(open('catalogue/ai-inbox/opencode-recover/loop-state/loop-ledger.csv',encoding='utf-8-sig')));c=collections.Counter(x['state'] for x in r);print(f\"{c['verified_pass']} pass, {c['exhausted']} exhausted, {c['open']} open\")"
    Write-Host "`ncommitting $n files -- $state" -ForegroundColor Cyan
    $msg = @"
chore(catalogue): final image-loop state before machine handoff

$state of 7771. Consolidated from all nine chat ledgers.
See docs/handoff-2026-08-23-image-loop.md to resume.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
"@
    git commit -m $msg
}

# 4. Push.
Write-Host "`npushing to origin/joseph..." -ForegroundColor Cyan
git push origin joseph
if ($LASTEXITCODE -ne 0) { throw "push failed - check your network and GitHub credentials" }

Write-Host "`nDone. On the other machine:" -ForegroundColor Green
Write-Host "  git clone -b joseph https://github.com/siewong007/online-shopping-platform.git"
Write-Host "  then follow docs/handoff-2026-08-23-image-loop.md"
