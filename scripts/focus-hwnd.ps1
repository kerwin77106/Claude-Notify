param([long]$Hwnd)

Add-Type -MemberDefinition '
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
' -Name W -Namespace Native

$h = [IntPtr]::new($Hwnd)
if ([Native.W]::IsIconic($h)) { [Native.W]::ShowWindow($h, 9) | Out-Null }
[Native.W]::SetForegroundWindow($h) | Out-Null
