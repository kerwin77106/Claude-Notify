param([string]$Event)  # start | stop | end

# Read Claude Code stdin JSON
# Use regex extraction instead of ConvertFrom-Json to avoid encoding issues
$inputText = ""
try { $inputText = [Console]::In.ReadToEnd() } catch { }

# Extract fields via regex (robust against garbled characters in other fields)
$sessionId = ""
if ($inputText -match '"session_id"\s*:\s*"([^"]+)"') { $sessionId = $Matches[1] }

$cwd = ""
if ($inputText -match '"cwd"\s*:\s*"([^"]+)"') {
    $cwd = $Matches[1] -replace '\\\\', '\'
}
if (-not $cwd) { $cwd = (Get-Location).Path }

$transcriptPath = ""
if ($inputText -match '"transcript_path"\s*:\s*"([^"]+)"') {
    $transcriptPath = $Matches[1] -replace '\\\\', '\'
}

# Find window handle on SessionStart (walk up process tree, skip explorer)
[long]$hwnd = 0
if ($Event -eq "start") {
    $currentPid = $PID
    $visited = @{}
    while ($currentPid -and -not $visited.ContainsKey($currentPid)) {
        $visited[$currentPid] = $true
        $proc = Get-Process -Id $currentPid -EA SilentlyContinue
        if ($proc -and $proc.MainWindowHandle -ne 0) {
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
    if ($hwnd -eq 0) {
        $wt = Get-Process -Name 'WindowsTerminal' -EA SilentlyContinue |
              Where-Object { $_.MainWindowHandle -ne 0 } |
              Sort-Object StartTime -Descending |
              Select-Object -First 1
        if ($wt) { $hwnd = $wt.MainWindowHandle.ToInt64() }
    }
}

# On Stop: read transcript to get first user prompt as session title
$title = ""
if ($Event -eq "stop" -and $transcriptPath -and (Test-Path $transcriptPath)) {
    try {
        # Read first 20 lines, find first user message
        $lines = Get-Content -Path $transcriptPath -TotalCount 20 -Encoding UTF8 -EA Stop
        foreach ($line in $lines) {
            if ($line -match '"type"\s*:\s*"user"' -and $line -match '"content"\s*:\s*"([^"]{1,100})') {
                $title = $Matches[1]
                # Clean up escape sequences
                $title = $title -replace '\\n', ' ' -replace '\\t', ' ' -replace '\s+', ' '
                # Truncate to 50 chars
                if ($title.Length -gt 50) { $title = $title.Substring(0, 50) + '...' }
                break
            }
        }
    } catch { }
}

# Build JSON
$escapedCwd = $cwd -replace '\\', '\\\\' -replace '"', '\\"'
$escapedTitle = $title -replace '\\', '\\\\' -replace '"', '\\"'
$jsonBody = '{"event":"' + $Event + '","sessionId":"' + $sessionId + '","cwd":"' + $escapedCwd + '","title":"' + $escapedTitle + '","pid":' + $PID + ',"hwnd":' + $hwnd + ',"timestamp":' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + '}'

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
