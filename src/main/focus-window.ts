import { execSync } from 'child_process'
import * as path from 'path'
import { app } from 'electron'

export function focusWindow(hwnd: number): boolean {
  if (!hwnd || hwnd === 0) return false

  try {
    const isDev = !app.isPackaged
    const scriptPath = isDev
      ? path.join(process.cwd(), 'scripts', 'focus-hwnd.ps1')
      : path.join(process.resourcesPath, 'scripts', 'focus-hwnd.ps1')

    execSync(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -Hwnd ${hwnd}`,
      { timeout: 2000, windowsHide: true, encoding: 'utf-8' }
    )
    return true
  } catch {
    return false
  }
}
