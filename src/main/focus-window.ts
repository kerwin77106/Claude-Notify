import { execSync } from 'child_process'

export function focusWindow(hwnd: number): boolean {
  if (!hwnd || hwnd === 0) return false

  try {
    execSync(
      `powershell.exe -NoProfile -WindowStyle Hidden -Command "Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport(\\\"user32.dll\\\")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport(\\\"user32.dll\\\")] public static extern bool IsIconic(IntPtr h);' -Name W -Namespace Native; $h=[IntPtr]::new(${hwnd}); if([Native.W]::IsIconic($h)){[Native.W]::ShowWindow($h,9)}; [Native.W]::SetForegroundWindow($h)"`,
      { timeout: 2000, windowsHide: true, encoding: 'utf-8' }
    )
    return true
  } catch {
    return false
  }
}
