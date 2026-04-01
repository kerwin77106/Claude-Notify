# Claude Notify - Uninstall Script
# Usage: powershell -ExecutionPolicy Bypass -File uninstall.ps1

$settingsPath = "$env:USERPROFILE\.claude\settings.json"

if (-not (Test-Path $settingsPath)) {
    Write-Host "ERROR: $settingsPath not found" -ForegroundColor Red
    exit 1
}

$settings = Get-Content $settingsPath -Raw | ConvertFrom-Json

if ($settings.hooks.Stop) {
    $settings.hooks.PSObject.Properties.Remove("Stop")
    $settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
    Write-Host "Stop hook removed. Notification disabled." -ForegroundColor Green
} else {
    Write-Host "No Stop hook found. Nothing to remove." -ForegroundColor Yellow
}
