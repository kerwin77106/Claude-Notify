param([long]$Hwnd)

Add-Type -MemberDefinition '
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(int idAttach, int idAttachTo, bool fAttach);
  [DllImport("kernel32.dll")] public static extern int GetCurrentThreadId();
' -Name W -Namespace Native

$h = [IntPtr]::new($Hwnd)

# Restore if minimized
if ([Native.W]::IsIconic($h)) {
    [Native.W]::ShowWindow($h, 9) | Out-Null
}

# Method 1: AttachThreadInput trick (most reliable)
$fgWnd = [Native.W]::GetForegroundWindow()
$fgPid = 0
$fgThread = [Native.W]::GetWindowThreadProcessId($fgWnd, [ref]$fgPid)
$targetPid = 0
$targetThread = [Native.W]::GetWindowThreadProcessId($h, [ref]$targetPid)
$curThread = [Native.W]::GetCurrentThreadId()

if ($fgThread -ne $targetThread) {
    [Native.W]::AttachThreadInput($curThread, $fgThread, $true) | Out-Null
    [Native.W]::AttachThreadInput($curThread, $targetThread, $true) | Out-Null
}

[Native.W]::BringWindowToTop($h) | Out-Null
[Native.W]::SetForegroundWindow($h) | Out-Null
[Native.W]::ShowWindow($h, 5) | Out-Null

if ($fgThread -ne $targetThread) {
    [Native.W]::AttachThreadInput($curThread, $fgThread, $false) | Out-Null
    [Native.W]::AttachThreadInput($curThread, $targetThread, $false) | Out-Null
}
