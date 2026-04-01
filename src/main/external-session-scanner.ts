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

  // Fast scan using wmic (much faster than PowerShell CIM)
  private scan(): void {
    try {
      // wmic is fast and doesn't need PowerShell
      const output = execSync(
        'wmic process where "name=\'claude.exe\'" get ProcessId,ParentProcessId /format:csv',
        { encoding: 'utf-8', timeout: 3000, windowsHide: true }
      ).trim()

      if (!output) {
        this.handleNoProcesses()
        return
      }

      // Parse CSV: Node,ParentProcessId,ProcessId
      const lines = output.split('\n').filter((l) => l.trim() && !l.startsWith('Node'))
      const internalPids = this.internalPidsProvider()

      // Collect all claude PIDs and their parents
      const claudeProcesses: { pid: number; parentPid: number }[] = []
      const allClaudePids = new Set<number>()

      for (const line of lines) {
        const parts = line.trim().split(',')
        if (parts.length < 3) continue
        const parentPid = parseInt(parts[1], 10)
        const pid = parseInt(parts[2], 10)
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
      const ps = cpSpawn('wmic', [
        'process', 'where', `ProcessId=${pid}`, 'get', 'CommandLine', '/format:list'
      ], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true })

      let data = ''
      ps.stdout?.on('data', (chunk) => { data += chunk.toString() })
      ps.on('close', () => {
        // Try to extract directory from command line
        const match = data.match(/CommandLine=(.+)/)
        if (match) {
          const cmdLine = match[1].trim()
          // claude.exe is usually run from the project directory
          // The cwd isn't in the command line, but we can try the parent's cwd
          // For now, just update the session name
        }

        // Alternative: try to get cwd via PowerShell (async, won't block)
        const ps2 = cpSpawn('powershell.exe', [
          '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
          `(Get-CimInstance Win32_Process -Filter "ProcessId=${session.parentPid}" -EA SilentlyContinue).CommandLine`
        ], { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true })

        let data2 = ''
        ps2.stdout?.on('data', (chunk) => { data2 += chunk.toString() })
        ps2.on('close', () => {
          // Try to extract path from parent's command line
          const pathMatch = data2.match(/-(?:WorkingDirectory|cd|wd)\s+"?([^"]+)"?/) ||
            data2.match(/Set-Location\s+"?([^"]+)"?/)
          if (pathMatch) {
            session.cwd = pathMatch[1].trim()
            session.name = session.cwd.split(/[/\\]/).pop() || session.name
            this.emit('status-change', session)
          }
        })
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
