import * as pty from 'node-pty'
import { EventEmitter } from 'events'

interface PtyInstance {
  process: pty.IPty
  pid: number
  outputBuffer: string[]
  maxBufferLines: number
}

export class PtyManager extends EventEmitter {
  private instances: Map<string, PtyInstance> = new Map()

  // Track PIDs of internally spawned claude processes (for Phase 7 exclusion)
  getInternalPids(): number[] {
    return Array.from(this.instances.values()).map((i) => i.pid)
  }

  // Create a new pty process running PowerShell, then auto-launch claude
  create(
    sessionId: string,
    cwd: string,
    cols: number = 80,
    rows: number = 24,
    maxBufferLines: number = 5000
  ): number {
    if (this.instances.has(sessionId)) {
      throw new Error(`PTY already exists for session ${sessionId}`)
    }

    // Spawn PowerShell as the shell, matching user's normal environment
    const shell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash'
    const shellArgs = process.platform === 'win32'
      ? ['-NoLogo', '-NoExit', '-Command', 'claude']
      : ['-c', 'claude']

    const proc = pty.spawn(shell, shellArgs, {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: { ...process.env },
      useConpty: true
    })

    const instance: PtyInstance = {
      process: proc,
      pid: proc.pid,
      outputBuffer: [],
      maxBufferLines
    }

    // Listen for data from the pty
    proc.onData((data: string) => {
      instance.outputBuffer.push(data)

      // Trim buffer if it exceeds max chunks
      if (instance.outputBuffer.length > maxBufferLines) {
        instance.outputBuffer = instance.outputBuffer.slice(-maxBufferLines)
      }

      this.emit('data', sessionId, data)
    })

    // Listen for exit
    proc.onExit(({ exitCode, signal }) => {
      this.emit('exit', sessionId, exitCode, signal)
      this.instances.delete(sessionId)
    })

    this.instances.set(sessionId, instance)
    return proc.pid
  }

  // Write data to a pty
  write(sessionId: string, data: string): void {
    const instance = this.instances.get(sessionId)
    if (!instance) {
      throw new Error(`No PTY found for session ${sessionId}`)
    }
    instance.process.write(data)
  }

  // Resize a pty
  resize(sessionId: string, cols: number, rows: number): void {
    const instance = this.instances.get(sessionId)
    if (!instance) return
    instance.process.resize(cols, rows)
  }

  // Kill a pty process (don't delete here; let onExit handler clean up)
  kill(sessionId: string): void {
    const instance = this.instances.get(sessionId)
    if (!instance) return
    instance.process.kill()
  }

  // Get the output buffer for a session
  getOutputBuffer(sessionId: string): string[] {
    const instance = this.instances.get(sessionId)
    if (!instance) return []
    return [...instance.outputBuffer]
  }

  // Check if a session has a pty
  has(sessionId: string): boolean {
    return this.instances.has(sessionId)
  }

  // Destroy all pty instances
  destroyAll(): void {
    for (const [, instance] of this.instances) {
      try {
        instance.process.kill()
      } catch {
        // Ignore errors during cleanup
      }
    }
    this.instances.clear()
  }
}
