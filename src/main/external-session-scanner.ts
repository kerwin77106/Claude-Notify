import { execSync, exec } from 'child_process'
import { EventEmitter } from 'events'
import * as path from 'path'
import { app } from 'electron'

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
  private resolvedPids: Set<number> = new Set() // PIDs already resolved (don't query again)
  private scanTimer: ReturnType<typeof setInterval> | null = null
  private internalPidsProvider: () => number[]
  private scanning = false
  private resolving = false

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

  // Bring parent window to foreground using external .ps1 script
  bringToFront(claudePid: number): boolean {
    const session = this.sessions.get(claudePid)
    if (!session) return false

    try {
      // Resolve script path (works in both dev and packaged mode)
      const isDev = !app.isPackaged
      const scriptPath = isDev
        ? path.join(process.cwd(), 'scripts', 'focus-window.ps1')
        : path.join(process.resourcesPath, 'scripts', 'focus-window.ps1')

      execSync(
        `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}" -TargetPid ${session.parentPid}`,
        { encoding: 'utf-8', timeout: 3000, windowsHide: true }
      )
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

      // Find new PIDs that we haven't seen or resolved before
      const internalPids = this.internalPidsProvider()
      const newPids: number[] = []

      for (const pid of foundPids) {
        if (!this.sessions.has(pid) && !this.resolvedPids.has(pid) && !internalPids.includes(pid)) {
          newPids.push(pid)
          this.resolvedPids.add(pid) // Mark as seen, won't query again
        }
      }

      // For new PIDs, get parent PID info asynchronously (only if not already resolving)
      if (newPids.length > 0 && !this.resolving) {
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
    this.resolving = true
    const pidFilter = newPids.map((p) => `ProcessId=${p}`).join(' OR ')
    const cmd = `powershell.exe -NoProfile -WindowStyle Hidden -Command "Get-CimInstance Win32_Process -Filter '${pidFilter}' | Select-Object ProcessId,ParentProcessId | ConvertTo-Csv -NoTypeInformation"`

    exec(cmd, { encoding: 'utf-8', timeout: 5000, windowsHide: true }, (err, stdout) => {
      this.resolving = false
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
      }
    })
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
