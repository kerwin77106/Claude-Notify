param([string]$Event)  # start | stop | end

# Read Claude Code stdin JSON
$inputText = ""
try { $inputText = [Console]::In.ReadToEnd() } catch { }
try { $inputData = $inputText | ConvertFrom-Json -EA Stop } catch { $inputData = @{} }

# Extract session_id and cwd
$sessionId = if ($inputData.session_id) { $inputData.session_id } else { "" }
$cwd = if ($inputData.cwd) { $inputData.cwd } else { (Get-Location).Path }

# Find window handle on SessionStart (walk up process tree)
$hwnd = 0
if ($Event -eq "start") {
    $currentPid = $PID
    $visited = @{}
    while ($currentPid -and -not $visited.ContainsKey($currentPid)) {
        $visited[$currentPid] = $true
        $proc = Get-Process -Id $currentPid -EA SilentlyContinue
        if ($proc -and $proc.MainWindowHandle -ne 0) {
            $hwnd = $proc.MainWindowHandle.ToInt64()
            break
        }
        try {
            $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -EA Stop).ParentProcessId
            $currentPid = $parentId
        } catch { break }
    }
}

# Build report payload
$body = @{
    event = $Event
    sessionId = $sessionId
    cwd = $cwd
    pid = $PID
    hwnd = $hwnd
    timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
} | ConvertTo-Json -Compress

# Send to Dashboard (silent fail if Dashboard not running)
try {
    Invoke-WebRequest -Uri "http://127.0.0.1:23847/api/hook/$Event" `
        -Method POST -Body $body -ContentType "application/json" `
        -TimeoutSec 2 -EA SilentlyContinue | Out-Null
} catch { }
