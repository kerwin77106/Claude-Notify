import { execSync, exec } from 'child_process'
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
  private scanning = false

  constructor(internalPidsProvider: () => number[]) {
    super()
    this.internalPidsProvider = internalPidsProvider
  }

  start(intervalMs: number = 5000): void {
    if (this.scanTimer) return
    setTimeout(() => this.scan(), 2000)
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

  // Bring parent window to foreground
  bringToFront(claudePid: number): boolean {
    const session = this.sessions.get(claudePid)
    if (!session) return false

    try {
      // Simple, reliable approach: use PowerShell synchronously but with short timeout
      const script =
        `Add-Type 'using System; using System.Runtime.InteropServices; public class W { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c); [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h); }'; ` +
        `$target = ${session.parentPid}; ` +
        `$p = Get-Process -Id $target -EA SilentlyContinue; ` +
        `if (!$p -or $p.MainWindowHandle -eq 0) { ` +
        `  try { $gp = (Get-CimInstance Win32_Process -Filter "ProcessId=$target" -EA Stop).ParentProcessId; $p = Get-Process -Id $gp -EA SilentlyContinue } catch {} ` +
        `}; ` +
        `if ($p -and $p.MainWindowHandle -ne 0) { ` +
        `  if ([W]::IsIconic($p.MainWindowHandle)) { [W]::ShowWindow($p.MainWindowHandle, 9) }; ` +
        `  [W]::SetForegroundWindow($p.MainWindowHandle) ` +
        `}`

      execSync(`powershell.exe -NoProfile -WindowStyle Hidden -Command "${script}"`, {
        encoding: 'utf-8',
        timeout: 3000,
        windowsHide: true
      })
      return true
    } catch {
      return false
    }
  }

  // Fast scan using tasklist (native Windows, very fast)
  private scan(): void {
    if (this.scanning) return
    this.scanning = true

    try {
      // tasklist is instant, no PowerShell needed
      const output = execSync(
        'tasklist /fi "imagename eq claude.exe" /fo csv /nh',
        { encoding: 'utf-8', timeout: 2000, windowsHide: true }
      ).trim()

      // No claude.exe running
      if (!output || output.includes('INFO:') || output.includes('No tasks')) {
        this.handleNoProcesses()
        this.scanning = false
        return
      }

      // Parse CSV: "claude.exe","PID","Session Name","Session#","Mem Usage"
      const lines = output.split('\n').filter((l) => l.includes('claude.exe'))
      const foundPids = new Set<number>()

      for (const line of lines) {
        const match = line.match(/"claude\.exe","(\d+)"/)
        if (!match) continue
        foundPids.add(parseInt(match[1], 10))
      }

      // Find new PIDs that we haven't seen before
      const internalPids = this.internalPidsProvider()
      const newPids: number[] = []

      for (const pid of foundPids) {
        if (!this.sessions.has(pid) && !internalPids.includes(pid)) {
          newPids.push(pid)
        }
      }

      // For new PIDs, get parent PID info asynchronously
      if (newPids.length > 0) {
        this.resolveNewPids(newPids, foundPids, internalPids)
      }

      // Mark exited sessions
      for (const [pid, session] of this.sessions) {
        if (!foundPids.has(pid) && session.status !== 'exited') {
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
    this.scanning = false
  }

  // Resolve parent PIDs for newly discovered claude processes (async, doesn't block UI)
  private resolveNewPids(newPids: number[], allClaudePids: Set<number>, internalPids: number[]): void {
    const pidFilter = newPids.map((p) => `ProcessId=${p}`).join(' OR ')
    const cmd = `powershell.exe -NoProfile -WindowStyle Hidden -Command "Get-CimInstance Win32_Process -Filter '${pidFilter}' | Select-Object ProcessId,ParentProcessId | ConvertTo-Csv -NoTypeInformation"`

    exec(cmd, { encoding: 'utf-8', timeout: 5000, windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return

      const lines = stdout.trim().split('\n').slice(1)
      for (const line of lines) {
        const cleaned = line.replace(/"/g, '').trim()
        const parts = cleaned.split(',')
        if (parts.length < 2) continue

        const pid = parseInt(parts[0], 10)
        const parentPid = parseInt(parts[1], 10)
        if (isNaN(pid) || isNaN(parentPid)) continue

        // Skip subagents (parent is also claude.exe)
        if (allClaudePids.has(parentPid)) continue

        // Skip internal sessions
        if (internalPids.includes(parentPid)) continue

        // Skip if already tracked
        if (this.sessions.has(pid)) continue

        const session: ExternalSession = {
          claudePid: pid,
          parentPid,
          cwd: '',
          name: `PID:${pid}`,
          status: 'running',
          detectedAt: Date.now()
        }

        this.sessions.set(pid, session)
        this.emit('new-session', session)

        // Try to get window title of parent for display name
        this.resolveParentTitle(session)
      }
    })
  }

  // Get parent window title (usually contains the working directory)
  private resolveParentTitle(session: ExternalSession): void {
    exec(
      `powershell.exe -NoProfile -WindowStyle Hidden -Command "(Get-Process -Id ${session.parentPid} -EA SilentlyContinue).MainWindowTitle"`,
      { encoding: 'utf-8', timeout: 3000, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout) return
        const title = stdout.trim()
        if (title && title.length > 1) {
          // Window title often contains path like "C:\Users\...\project"
          session.name = title.split(/[\\\/]/).pop() || title
          session.cwd = title
          this.emit('status-change', session)
        }
      }
    )
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
