param([int]$TargetPid)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinFocus {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@

function FocusWindow($targetProc) {
    if ($targetProc -and $targetProc.MainWindowHandle -ne 0) {
        if ([WinFocus]::IsIconic($targetProc.MainWindowHandle)) {
            [WinFocus]::ShowWindow($targetProc.MainWindowHandle, 9) | Out-Null
        }
        [WinFocus]::SetForegroundWindow($targetProc.MainWindowHandle) | Out-Null
        return $true
    }
    return $false
}

# Strategy 1: Walk up the process tree to find a window
$visited = @{}
$currentPid = $TargetPid
while ($currentPid -and -not $visited.ContainsKey($currentPid)) {
    $visited[$currentPid] = $true
    $currentProc = Get-Process -Id $currentPid -ErrorAction SilentlyContinue
    if (FocusWindow $currentProc) { exit 0 }
    try {
        $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction Stop).ParentProcessId
        if ($parentId -and $parentId -ne 0 -and $parentId -ne $currentPid) {
            $currentPid = $parentId
        } else { break }
    } catch { break }
}

# Strategy 2: If parent is explorer, the console is likely hosted by Windows Terminal
$wtProc = Get-Process -Name 'WindowsTerminal' -ErrorAction SilentlyContinue | Select-Object -First 1
if (FocusWindow $wtProc) { exit 0 }

# Strategy 3: Try conhost or cmd windows
$conhost = Get-Process -Name 'conhost' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (FocusWindow $conhost) { exit 0 }

exit 1
