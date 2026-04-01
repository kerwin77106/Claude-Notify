import { EventEmitter } from 'events'
import type { SessionStatus } from '../shared/types'

interface TrackedSession {
  status: SessionStatus
  lastDataAt: number
  runningStartedAt: number | null
  idleTimer: ReturnType<typeof setTimeout> | null
}

// Idle threshold in milliseconds (2 seconds of no output = idle)
const IDLE_THRESHOLD_MS = 2000

export class StatusDetector extends EventEmitter {
  private sessions: Map<string, TrackedSession> = new Map()

  // Start tracking a session
  startTracking(sessionId: string): void {
    this.sessions.set(sessionId, {
      status: 'idle',
      lastDataAt: Date.now(),
      runningStartedAt: null,
      idleTimer: null
    })
  }

  // Called when data is received from the pty
  onDataReceived(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.lastDataAt = Date.now()

    // Clear existing idle timer
    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
      session.idleTimer = null
    }

    // If not already running, transition to running
    if (session.status !== 'running') {
      const oldStatus = session.status
      session.status = 'running'
      session.runningStartedAt = Date.now()
      this.emit('statusChanged', sessionId, oldStatus, 'running', 0)
    }

    // Set idle timer
    session.idleTimer = setTimeout(() => {
      this.transitionToIdle(sessionId)
    }, IDLE_THRESHOLD_MS)
  }

  // Called when the pty process exits
  onProcessExited(sessionId: string, exitCode: number): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
      session.idleTimer = null
    }

    const oldStatus = session.status
    const duration = this.getRunningDuration(sessionId)
    const newStatus: SessionStatus = exitCode === 0 ? 'exited' : 'error'

    session.status = newStatus
    session.runningStartedAt = null

    this.emit('statusChanged', sessionId, oldStatus, newStatus, duration)
  }

  // Get the current status of a session
  getStatus(sessionId: string): SessionStatus {
    const session = this.sessions.get(sessionId)
    return session?.status ?? 'exited'
  }

  // Get the running duration in ms (0 if not running)
  getRunningDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId)
    if (!session || !session.runningStartedAt) return 0
    return Date.now() - session.runningStartedAt
  }

  // Get runningStartedAt timestamp
  getRunningStartedAt(sessionId: string): number | null {
    const session = this.sessions.get(sessionId)
    return session?.runningStartedAt ?? null
  }

  // Stop tracking a session
  stopTracking(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    if (session.idleTimer) {
      clearTimeout(session.idleTimer)
    }

    this.sessions.delete(sessionId)
  }

  // Stop tracking all sessions
  destroyAll(): void {
    for (const [sessionId] of this.sessions) {
      this.stopTracking(sessionId)
    }
  }

  private transitionToIdle(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') return

    const duration = this.getRunningDuration(sessionId)
    const oldStatus = session.status

    session.status = 'idle'
    session.runningStartedAt = null

    this.emit('statusChanged', sessionId, oldStatus, 'idle', duration)
  }
}
