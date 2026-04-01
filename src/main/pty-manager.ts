import * as pty from 'node-pty'
import { EventEmitter } from 'events'
import { execSync } from 'child_process'
import * as path from 'path'

interface PtyInstance {
  process: pty.IPty
  outputBuffer: string[]
  maxBufferLines: number
}

export class PtyManager extends EventEmitter {
  private instances: Map<string, PtyInstance> = new Map()

  // Create a new pty process for a session
  create(
    sessionId: string,
    cwd: string,
    cols: number = 120,
    rows: number = 30,
    maxBufferLines: number = 5000
  ): number {
    if (this.instances.has(sessionId)) {
      throw new Error(`PTY already exists for session ${sessionId}`)
    }

    // Resolve claude executable full path (node-pty needs it on Windows)
    let claudePath = 'claude'
    if (process.platform === 'win32') {
      try {
        claudePath = execSync('where claude.exe', { encoding: 'utf-8' }).trim().split('\n')[0].trim()
      } catch {
        // Fallback to common location
        claudePath = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe')
      }
    }

    const proc = pty.spawn(claudePath, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: 'xterm-256color',
      },
      useConpty: true
    })

    const instance: PtyInstance = {
      process: proc,
      outputBuffer: [],
      maxBufferLines
    }

    // Listen for data from the pty
    proc.onData((data: string) => {
      instance.outputBuffer.push(data)

      // Trim buffer if it exceeds max lines
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
    for (const [sessionId, instance] of this.instances) {
      try {
        instance.process.kill()
      } catch {
        // Ignore errors during cleanup
      }
      this.instances.delete(sessionId)
    }
  }
}
