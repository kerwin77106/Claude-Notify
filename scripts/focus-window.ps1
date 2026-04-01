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

function FindAncestorWindow($startPid) {
    $visited = @{}
    $currentPid = $startPid
    while ($currentPid -and -not $visited.ContainsKey($currentPid)) {
        $visited[$currentPid] = $true
        $currentProc = Get-Process -Id $currentPid -ErrorAction SilentlyContinue
        if ($currentProc -and $currentProc.MainWindowHandle -ne 0) {
            return $currentProc
        }
        try {
            $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid" -ErrorAction Stop).ParentProcessId
            if ($parentId -and $parentId -ne 0) {
                $currentPid = $parentId
            } else {
                break
            }
        } catch {
            break
        }
    }
    return $null
}

# Walk up the process tree until we find a window
$foundProc = FindAncestorWindow $TargetPid
if (FocusWindow $foundProc) { exit 0 }

exit 1
