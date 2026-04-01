import { execSync } from 'child_process'
import { EventEmitter } from 'events'

export interface ExternalSession {
  claudePid: number
  parentPid: number
  cwd: string
  name: string
  status: 'running' | 'done' | 'exited'
  detectedAt: number
  doneAt?: number
}

export class ExternalSessionScanner extends EventEmitter {
  private sessions: Map<number, ExternalSession> = new Map()
  private scanTimer: ReturnType<typeof setInterval> | null = null
  private internalPidsProvider: () => number[]

  constructor(internalPidsProvider: () => number[]) {
    super()
    this.internalPidsProvider = internalPidsProvider
  }

  // Start periodic scanning
  start(intervalMs: number = 3000): void {
    if (this.scanTimer) return
    this.scan() // Initial scan
    this.scanTimer = setInterval(() => this.scan(), intervalMs)
  }

  // Stop scanning
  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer)
      this.scanTimer = null
    }
  }

  // Get all external sessions
  getSessions(): ExternalSession[] {
    return Array.from(this.sessions.values())
  }

  // Mark a session as done (called from Stop hook HTTP endpoint)
  markDone(pid: number): void {
    const session = this.sessions.get(pid)
    if (session && session.status === 'running') {
      session.status = 'done'
      session.doneAt = Date.now()
      this.emit('status-change', session)
    }
  }

  // Bring the parent window (PowerShell/Terminal) to foreground
  bringToFront(claudePid: number): boolean {
    const session = this.sessions.get(claudePid)
    if (!session) return false

    try {
      const script = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Win32Focus {
            [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
            [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
            [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
          }
"@
        $proc = Get-Process -Id ${session.parentPid} -ErrorAction SilentlyContinue
        if ($proc -and $proc.MainWindowHandle -ne 0) {
          if ([Win32Focus]::IsIconic($proc.MainWindowHandle)) {
            [Win32Focus]::ShowWindow($proc.MainWindowHandle, 9)
          }
          [Win32Focus]::SetForegroundWindow($proc.MainWindowHandle)
          Write-Output "OK"
        } else {
          # Try grandparent (e.g. Windows Terminal hosts PowerShell)
          $grandParentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=${session.parentPid}" -ErrorAction SilentlyContinue).ParentProcessId
          if ($grandParentPid) {
            $gProc = Get-Process -Id $grandParentPid -ErrorAction SilentlyContinue
            if ($gProc -and $gProc.MainWindowHandle -ne 0) {
              if ([Win32Focus]::IsIconic($gProc.MainWindowHandle)) {
                [Win32Focus]::ShowWindow($gProc.MainWindowHandle, 9)
              }
              [Win32Focus]::SetForegroundWindow($gProc.MainWindowHandle)
              Write-Output "OK"
            }
          }
        }
      `
      const result = execSync(`powershell.exe -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        timeout: 5000
      }).trim()
      return result.includes('OK')
    } catch {
      return false
    }
  }

  // Scan for claude.exe processes
  private scan(): void {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'claude.exe\'\\" | Select-Object ProcessId, ParentProcessId, ExecutablePath | ConvertTo-Json -Compress"',
        { encoding: 'utf-8', timeout: 5000 }
      ).trim()

      if (!output || output === '' || output === 'null') {
        this.handleNoProcesses()
        return
      }

      const processes = Array.isArray(JSON.parse(output)) ? JSON.parse(output) : [JSON.parse(output)]
      const internalPids = this.internalPidsProvider()
      const currentPids = new Set<number>()

      for (const proc of processes) {
        const pid = proc.ProcessId
        const parentPid = proc.ParentProcessId

        // Skip internal sessions
        if (internalPids.includes(pid)) continue

        currentPids.add(pid)

        if (!this.sessions.has(pid)) {
          // New external session detected
          const cwd = this.getCwd(pid)
          const name = cwd ? cwd.split(/[/\\]/).pop() || `PID:${pid}` : `PID:${pid}`

          const session: ExternalSession = {
            claudePid: pid,
            parentPid,
            cwd: cwd || '',
            name,
            status: 'running',
            detectedAt: Date.now()
          }

          this.sessions.set(pid, session)
          this.emit('new-session', session)
        }
      }

      // Check for exited processes
      for (const [pid, session] of this.sessions) {
        if (!currentPids.has(pid) && session.status !== 'exited') {
          session.status = 'exited'
          this.emit('status-change', session)
        }
      }

      // Clean up sessions that have been exited for over 5 minutes
      const fiveMinAgo = Date.now() - 5 * 60 * 1000
      for (const [pid, session] of this.sessions) {
        if (session.status === 'exited' && (session.doneAt || session.detectedAt) < fiveMinAgo) {
          this.sessions.delete(pid)
          this.emit('removed', pid)
        }
      }
    } catch {
      // Scan failed, skip this cycle
    }
  }

  // Get working directory of a process
  private getCwd(pid: number): string {
    try {
      const result = execSync(
        `powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
        { encoding: 'utf-8', timeout: 3000 }
      ).trim()

      // Try to extract --cwd or working directory from command line
      const cwdMatch = result.match(/--cwd\s+"?([^"]+)"?/) || result.match(/--directory\s+"?([^"]+)"?/)
      if (cwdMatch) return cwdMatch[1]

      // Fallback: use parent process's current directory
      return ''
    } catch {
      return ''
    }
  }

  private handleNoProcesses(): void {
    for (const [, session] of this.sessions) {
      if (session.status !== 'exited') {
        session.status = 'exited'
        this.emit('status-change', session)
      }
    }
  }
}
