// Shared TypeScript interfaces for IPC communication

export type SessionStatus = 'idle' | 'running' | 'waiting' | 'exited' | 'error'

export interface Session {
  id: string
  name: string
  cwd: string
  status: SessionStatus
  createdAt: number
  runningStartedAt: number | null
  runningDurationMs: number
  order: number
  pid: number | null
}

export interface CreateSessionOptions {
  name?: string
  cwd?: string
  cols?: number
  rows?: number
}

export interface AppSettings {
  notification: NotificationSettings
  theme: 'dark' | 'light'
  window: WindowSettings
  general: GeneralSettings
}

export interface NotificationSettings {
  enabled: boolean
  runningThresholdMs: number
  muteStart: string | null // HH:mm format or null
  muteEnd: string | null   // HH:mm format or null
  sound: boolean
}

export interface WindowSettings {
  width: number
  height: number
  x: number | undefined
  y: number | undefined
  isMaximized: boolean
}

export interface GeneralSettings {
  defaultCwd: string
  maxOutputBufferLines: number
  confirmBeforeClose: boolean
}

export interface NotificationRecord {
  id: string
  sessionId: string
  sessionName: string
  type: 'completed' | 'error' | 'idle'
  message: string
  timestamp: number
  read: boolean
}

export interface GitFileStat {
  file: string
  additions: number
  deletions: number
}

export interface GitDiffResult {
  cwd: string
  files: GitFileStat[]
  totalAdditions: number
  totalDeletions: number
}

export interface SessionStats {
  totalSessions: number
  totalRunningTimeMs: number
  totalCommands: number
  sessionsToday: number
  commandsToday: number
  dailyStats: DailyStat[]
}

export interface DailyStat {
  date: string // YYYY-MM-DD
  sessions: number
  commands: number
  runningTimeMs: number
}

export interface UpdateCheckResult {
  updateAvailable: boolean
  version?: string
  releaseNotes?: string
  downloadUrl?: string
}

export interface StatusChangeEvent {
  sessionId: string
  oldStatus: SessionStatus
  newStatus: SessionStatus
  runningDurationMs: number
}

export interface PtyDataEvent {
  sessionId: string
  data: string
}

export interface PtyExitEvent {
  sessionId: string
  exitCode: number
  signal?: number
}

