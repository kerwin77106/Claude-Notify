import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import type { Session, CreateSessionOptions } from '../shared/types'
import type { PtyManager } from './pty-manager'
import type { StatusDetector } from './status-detector'
import type { SettingsManager } from './settings-manager'

interface SessionStore {
  sessionOrder: string[]
}

export class SessionManager {
  private sessions: Map<string, Session> = new Map()
  private store: Store<SessionStore>
  private ptyManager: PtyManager
  private statusDetector: StatusDetector
  private settingsManager: SettingsManager

  constructor(
    ptyManager: PtyManager,
    statusDetector: StatusDetector,
    settingsManager: SettingsManager
  ) {
    this.ptyManager = ptyManager
    this.statusDetector = statusDetector
    this.settingsManager = settingsManager

    this.store = new Store<SessionStore>({
      name: 'sessions',
      defaults: {
        sessionOrder: []
      }
    })
  }

  // Create a new session
  createSession(options: CreateSessionOptions = {}): Session {
    const settings = this.settingsManager.get()
    const id = uuidv4()
    const name = options.name || `Session ${this.sessions.size + 1}`
    const cwd = options.cwd || settings.general.defaultCwd
    const cols = options.cols || 120
    const rows = options.rows || 30

    // Spawn pty
    const pid = this.ptyManager.create(
      id,
      cwd,
      cols,
      rows,
      settings.general.maxOutputBufferLines
    )

    // Start status tracking
    this.statusDetector.startTracking(id)

    const session: Session = {
      id,
      name,
      cwd,
      status: 'idle',
      createdAt: Date.now(),
      runningStartedAt: null,
      runningDurationMs: 0,
      order: this.sessions.size,
      pid
    }

    this.sessions.set(id, session)

    // Persist order
    const order = this.store.get('sessionOrder')
    order.push(id)
    this.store.set('sessionOrder', order)

    return session
  }

  // List all active sessions
  listSessions(): Session[] {
    const order = this.store.get('sessionOrder')
    const sessions: Session[] = []

    // Return in persisted order, update status from detector
    for (const id of order) {
      const session = this.sessions.get(id)
      if (session) {
        session.status = this.statusDetector.getStatus(id)
        session.runningStartedAt = this.statusDetector.getRunningStartedAt(id)
        session.runningDurationMs = this.statusDetector.getRunningDuration(id)
        sessions.push(session)
      }
    }

    // Append any sessions not in persisted order
    for (const [id, session] of this.sessions) {
      if (!order.includes(id)) {
        session.status = this.statusDetector.getStatus(id)
        session.runningStartedAt = this.statusDetector.getRunningStartedAt(id)
        session.runningDurationMs = this.statusDetector.getRunningDuration(id)
        sessions.push(session)
      }
    }

    return sessions
  }

  // Close a session
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    this.ptyManager.kill(sessionId)
    this.statusDetector.stopTracking(sessionId)
    this.sessions.delete(sessionId)

    // Remove from persisted order
    const order = this.store.get('sessionOrder')
    this.store.set(
      'sessionOrder',
      order.filter((id: string) => id !== sessionId)
    )
  }

  // Rename a session
  renameSession(sessionId: string, name: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) return
    session.name = name
  }

  // Reorder sessions
  reorderSessions(sessionIds: string[]): void {
    this.store.set('sessionOrder', sessionIds)
    sessionIds.forEach((id, index) => {
      const session = this.sessions.get(id)
      if (session) {
        session.order = index
      }
    })
  }

  // Export session output buffer as text
  exportSession(sessionId: string): string {
    const buffer = this.ptyManager.getOutputBuffer(sessionId)
    return buffer.join('')
  }

  // Get a session by ID
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId)
  }

  // Destroy all sessions
  destroyAll(): void {
    for (const [sessionId] of this.sessions) {
      this.ptyManager.kill(sessionId)
      this.statusDetector.stopTracking(sessionId)
    }
    this.sessions.clear()
  }
}
