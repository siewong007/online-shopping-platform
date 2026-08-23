[CmdletBinding()]
param(
    [string]$ApiBaseUrl = "http://127.0.0.1:4000",
    [string]$DatabaseContainer = "online-shopping-db"
)

$ErrorActionPreference = "Stop"

function Read-PlaintextPassword {
    param([string]$Prompt)

    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

$token = $null
$newPassword = $null
$confirmation = $null
$body = $null
$random = $null
$bytes = New-Object byte[] 32

try {
    $health = Invoke-WebRequest -UseBasicParsing -Uri "$ApiBaseUrl/api/storefront" -TimeoutSec 10
    if ($health.StatusCode -ne 200) {
        throw "The local Ekoway API is not ready at $ApiBaseUrl."
    }

    $adminId = (& docker exec $DatabaseContainer psql -U project_depot -d project_depot -tA -c "SELECT id FROM admin_users WHERE lower(username) = 'admin' AND is_active = true LIMIT 1;").Trim()
    if (-not $adminId -or $adminId -notmatch '^\d+$') {
        throw "The active local admin account was not found."
    }

    $newPassword = Read-PlaintextPassword "New admin password (minimum 16 characters)"
    $confirmation = Read-PlaintextPassword "Confirm new admin password"
    if ($newPassword.Length -lt 16) {
        throw "The new password must contain at least 16 characters."
    }
    if ($newPassword -cne $confirmation) {
        throw "The passwords do not match."
    }

    $random = New-Object Security.Cryptography.RNGCryptoServiceProvider
    $random.GetBytes($bytes)
    $token = ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()

    $insertSession = "INSERT INTO admin_sessions(token, admin_user_id, expires_at, mfa_verified_at) VALUES ('$token', $adminId, now() + interval '5 minutes', now());"
    & docker exec $DatabaseContainer psql -U project_depot -d project_depot -v ON_ERROR_STOP=1 -c $insertSession | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not create the short-lived local recovery session."
    }

    $headers = @{ Authorization = "Bearer $token" }
    $body = @{ new_password = $newPassword } | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -UseBasicParsing -Method Put -Uri "$ApiBaseUrl/api/admin/users/$adminId/password" -Headers $headers -ContentType "application/json" -Body $body -TimeoutSec 30
    if ($response.StatusCode -ne 204) {
        throw "The password reset endpoint returned HTTP $($response.StatusCode)."
    }

    Write-Host "Admin password reset successfully. Sign in with username: admin" -ForegroundColor Green
}
finally {
    if ($token) {
        $deleteSession = "DELETE FROM admin_sessions WHERE token = '$token';"
        & docker exec $DatabaseContainer psql -U project_depot -d project_depot -c $deleteSession 2>$null | Out-Null
    }

    if ($random) {
        $random.Dispose()
    }
    [Array]::Clear($bytes, 0, $bytes.Length)
    $body = $null
    $confirmation = $null
    $newPassword = $null
    $token = $null
}
