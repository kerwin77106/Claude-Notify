param([string]$Event)  # start | stop | end

# Read Claude Code stdin JSON
$inputText = ""
try { $inputText = [Console]::In.ReadToEnd() } catch { }
try { $inputData = $inputText | ConvertFrom-Json -EA Stop } catch { $inputData = $null }

# Extract session_id
$sessionId = ""
if ($inputData -and $inputData.session_id) { $sessionId = $inputData.session_id }

# Get CWD: prefer CLAUDE_PROJECT_DIR env var
$cwd = ""
if ($env:CLAUDE_PROJECT_DIR) {
    $cwd = $env:CLAUDE_PROJECT_DIR
} elseif ($inputData -and $inputData.cwd) {
    $cwd = $inputData.cwd
} else {
    $cwd = (Get-Location).Path
}

# Find window handle on SessionStart
# Walk up process tree, skip explorer.exe (its HWND is a hidden window)
[long]$hwnd = 0
if ($Event -eq "start") {
    # Strategy 1: Walk process tree to find a real terminal window
    $currentPid = $PID
    $visited = @{}
    while ($currentPid -and -not $visited.ContainsKey($currentPid)) {
        $visited[$currentPid] = $true
        $proc = Get-Process -Id $currentPid -EA SilentlyContinue
        if ($proc -and $proc.MainWindowHandle -ne 0) {
            # Skip explorer.exe — its HWND is a hidden shell window, not our terminal
            if ($proc.ProcessName -ne 'explorer') {
                $hwnd = $proc.MainWindowHandle.ToInt64()
                break
            }
        }
        try {
            $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -EA Stop).ParentProcessId
            $currentPid = $parentId
        } catch { break }
    }

    # Strategy 2: If not found, try to find any WindowsTerminal window
    # (for cases where claude was launched from explorer address bar)
    if ($hwnd -eq 0) {
        $wt = Get-Process -Name 'WindowsTerminal' -EA SilentlyContinue |
              Where-Object { $_.MainWindowHandle -ne 0 } |
              Sort-Object StartTime -Descending |
              Select-Object -First 1
        if ($wt) {
            $hwnd = $wt.MainWindowHandle.ToInt64()
        }
    }
}

# Build JSON
$escapedCwd = $cwd -replace '\\', '\\\\' -replace '"', '\\"'
$jsonBody = '{"event":"' + $Event + '","sessionId":"' + $sessionId + '","cwd":"' + $escapedCwd + '","pid":' + $PID + ',"hwnd":' + $hwnd + ',"timestamp":' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + '}'

# Send to Dashboard
try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    $req = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:23847/api/hook/$Event")
    $req.Method = "POST"
    $req.ContentType = "application/json; charset=utf-8"
    $req.ContentLength = $bytes.Length
    $req.Timeout = 2000
    $s = $req.GetRequestStream()
    $s.Write($bytes, 0, $bytes.Length)
    $s.Close()
    $null = $req.GetResponse()
} catch { }
