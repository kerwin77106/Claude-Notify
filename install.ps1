# Claude Notify - Install Script
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$settingsPath = "$env:USERPROFILE\.claude\settings.json"
$scriptPath = $PSScriptRoot + "\notify-done.ps1"
$escapedPath = $scriptPath.Replace("\", "\\")

if (-not (Test-Path $settingsPath)) {
    Write-Host "ERROR: $settingsPath not found" -ForegroundColor Red
    exit 1
}

$settings = Get-Content $settingsPath -Raw | ConvertFrom-Json

# Check if Stop hook already exists
if ($settings.hooks.Stop) {
    Write-Host "Stop hook already exists, updating path..." -ForegroundColor Yellow
    $settings.hooks.Stop[0].hooks[0].command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$escapedPath`""
} else {
    Write-Host "Adding Stop hook..." -ForegroundColor Cyan
    $stopHook = @(
        @{
            matcher = ""
            hooks = @(
                @{
                    type = "command"
                    command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$escapedPath`""
                    statusMessage = "Sending notification..."
                }
            )
        }
    )
    $settings.hooks | Add-Member -NotePropertyName "Stop" -NotePropertyValue $stopHook
}

$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
Write-Host "Done! Claude Code will notify you on task completion." -ForegroundColor Green
Write-Host "Script path: $scriptPath" -ForegroundColor Gray
Write-Host "Restart Claude Code sessions to apply." -ForegroundColor Gray
