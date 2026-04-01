import type {
  Session,
  NotificationRecord,
  AppSettings,
  GitDiffResult,
  SessionStats,
  UpdateCheckResult,
  PtyDataEvent,
  PtyExitEvent,
  StatusChangeEvent
} from '../../shared/types'

// Re-export Session as SessionInfo for renderer usage
export type SessionInfo = Session

// ElectronAPI interface exposed by preload (nested structure)
export interface ElectronAPI {
  pty: {
    create(params: { cwd: string; cols: number; rows: number }): Promise<Session>
    write(sessionId: string, data: string): void
    resize(sessionId: string, cols: number, rows: number): void
    kill(sessionId: string): Promise<void>
    onData(callback: (event: PtyDataEvent) => void): () => void
    onExit(callback: (event: PtyExitEvent) => void): () => void
  }
  session: {
    list(): Promise<Session[]>
    rename(sessionId: string, newName: string): Promise<void>
    reorder(orderedSessionIds: string[]): Promise<void>
    export(sessionId: string): Promise<string>
    onStatusChange(callback: (event: StatusChangeEvent) => void): () => void
  }
  dialog: {
    selectFolder(): Promise<{ canceled: boolean; folderPath?: string }>
  }
  notification: {
    onClicked(callback: (event: { sessionId: string }) => void): () => void
    getHistory(limit?: number, offset?: number): Promise<{ records: NotificationRecord[]; total: number }>
  }
  settings: {
    get(key?: string): Promise<AppSettings>
    set(key: string, value: unknown): Promise<void>
  }
  window: {
    state(action: string): Promise<unknown>
    setTitle(title: string): void
    onStateChange(callback: (data: { isMaximized: boolean }) => void): () => void
  }
  git: {
    diffStat(cwd: string): Promise<GitDiffResult>
  }
  stats: {
    get(period?: string): Promise<SessionStats>
  }
  tray: {
    update(tooltip: string, count: number): void
    onAction(callback: (action: string) => void): () => void
  }
  updater: {
    check(): Promise<UpdateCheckResult>
    getVersion(): Promise<string>
    onStatus(callback: (data: { status: string; info?: unknown }) => void): () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
