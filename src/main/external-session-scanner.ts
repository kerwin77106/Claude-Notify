import { execSync, spawn as cpSpawn } from 'child_process'
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

  start(intervalMs: number = 3000): void {
    if (this.scanTimer) return
    // Delay first scan to let app initialize
    setTimeout(() => this.scan(), 1000)
    this.scanTimer = setInterval(() => this.scan(), intervalMs)
  }

  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer)
      this.scanTimer = null
    }
  }

  getSessions(): ExternalSession[] {
    return Array.from(this.sessions.values())
  }

  markDone(pid: number): void {
    const session = this.sessions.get(pid)
    if (session && session.status === 'running') {
      session.status = 'done'
      session.doneAt = Date.now()
      this.emit('status-change', session)
    }
  }

  // Bring parent window to foreground using a fire-and-forget PowerShell
  bringToFront(claudePid: number): boolean {
    const session = this.sessions.get(claudePid)
    if (!session) return false

    try {
      // Fire and forget — don't wait for result
      const ps = cpSpawn('powershell.exe', [
        '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
        `$pids = @(${session.parentPid}); ` +
        `$p = Get-Process -Id $pids -EA SilentlyContinue; ` +
        `if (!$p -or !$p.MainWindowHandle) { ` +
        `  $gp = (Get-CimInstance Win32_Process -Filter "ProcessId=${session.parentPid}" -EA SilentlyContinue).ParentProcessId; ` +
        `  if ($gp) { $p = Get-Process -Id $gp -EA SilentlyContinue } ` +
        `}; ` +
        `if ($p -and $p.MainWindowHandle) { ` +
        `  Add-Type 'using System; using System.Runtime.InteropServices; public class W { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); }'; ` +
        `  [W]::ShowWindow($p.MainWindowHandle, 9); ` +
        `  [W]::SetForegroundWindow($p.MainWindowHandle) ` +
        `}`
      ], { detached: true, stdio: 'ignore' })
      ps.unref()
      return true
    } catch {
      return false
    }
  }

  // Fast scan using tasklist + PowerShell Get-CimInstance (single call)
  private scan(): void {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -WindowStyle Hidden -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'claude.exe\'\\" | Select-Object ProcessId,ParentProcessId | ConvertTo-Csv -NoTypeInformation"',
        { encoding: 'utf-8', timeout: 5000, windowsHide: true }
      ).trim()

      if (!output || !output.includes(',')) {
        this.handleNoProcesses()
        return
      }

      // Parse CSV: "ProcessId","ParentProcessId"
      const lines = output.split('\n').slice(1) // skip header
      const internalPids = this.internalPidsProvider()

      const claudeProcesses: { pid: number; parentPid: number }[] = []
      const allClaudePids = new Set<number>()

      for (const line of lines) {
        const cleaned = line.replace(/"/g, '').trim()
        if (!cleaned) continue
        const parts = cleaned.split(',')
        if (parts.length < 2) continue
        const pid = parseInt(parts[0], 10)
        const parentPid = parseInt(parts[1], 10)
        if (isNaN(pid) || isNaN(parentPid)) continue
        claudeProcesses.push({ pid, parentPid })
        allClaudePids.add(pid)
      }

      const currentPids = new Set<number>()

      for (const { pid, parentPid } of claudeProcesses) {
        // Skip subagents (parent is also claude.exe)
        if (allClaudePids.has(parentPid)) continue

        // Skip internal sessions (parent is our PowerShell PTY)
        if (internalPids.includes(parentPid)) continue

        currentPids.add(pid)

        if (!this.sessions.has(pid)) {
          const name = `PID:${pid}`
          const session: ExternalSession = {
            claudePid: pid,
            parentPid,
            cwd: '',
            name,
            status: 'running',
            detectedAt: Date.now()
          }

          // Try to get cwd asynchronously (don't block scan)
          this.resolveCwdAsync(pid, session)

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

      // Clean up old exited sessions (> 5 min)
      const cutoff = Date.now() - 5 * 60 * 1000
      for (const [pid, session] of this.sessions) {
        if (session.status === 'exited' && (session.doneAt || session.detectedAt) < cutoff) {
          this.sessions.delete(pid)
          this.emit('removed', pid)
        }
      }
    } catch {
      // Scan failed, skip
    }
  }

  // Resolve cwd in background without blocking scan
  private resolveCwdAsync(pid: number, session: ExternalSession): void {
    try {
      // Use PowerShell to get the working directory of the parent process (shell)
      const ps = cpSpawn('powershell.exe', [
        '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
        // Get parent shell's current directory via CIM
        `$p = Get-CimInstance Win32_Process -Filter "ProcessId=${session.parentPid}" -EA SilentlyContinue; ` +
        `if ($p) { $p.ExecutablePath | Split-Path -Parent } else { "" }`
      ], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true })

      let data = ''
      ps.stdout?.on('data', (chunk) => { data += chunk.toString() })
      ps.on('close', () => {
        const cwd = data.trim()
        if (cwd && cwd.length > 2) {
          session.cwd = cwd
          session.name = cwd.split(/[/\\]/).pop() || session.name
          this.emit('status-change', session)
        }
      })
    } catch {
      // Ignore cwd resolution errors
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
