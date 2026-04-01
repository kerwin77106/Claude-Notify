param([string]$Event)  # start | stop | end

# Force UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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

# Build JSON manually to avoid encoding issues with ConvertTo-Json
$escapedCwd = $cwd -replace '\\', '\\' -replace '"', '\"'
$body = "{`"event`":`"$Event`",`"sessionId`":`"$sessionId`",`"cwd`":`"$escapedCwd`",`"pid`":$PID,`"hwnd`":$hwnd,`"timestamp`":$([DateTimeOffset]::Now.ToUnixTimeMilliseconds())}"

# Send to Dashboard via HttpWebRequest with UTF-8 encoding
try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $request = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:23847/api/hook/$Event")
    $request.Method = "POST"
    $request.ContentType = "application/json; charset=utf-8"
    $request.ContentLength = $bytes.Length
    $request.Timeout = 2000
    $stream = $request.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    $null = $request.GetResponse()
} catch { }
