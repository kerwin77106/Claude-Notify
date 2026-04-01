import { app } from 'electron'
import { PtyManager } from './pty-manager'
import { StatusDetector } from './status-detector'
import { SessionManager } from './session-manager'
import { SettingsManager } from './settings-manager'
import { NotificationManager } from './notification-manager'
import { TrayManager } from './tray-manager'
import { WindowManager } from './window-manager'
import { GitService } from './git-service'
import { StatsService } from './stats-service'
import { UpdaterService } from './updater-service'
import { ExternalSessionScanner } from './external-session-scanner'
import { HookServer } from './hook-server'
import { registerAllIpcHandlers } from './ipc-handler'
import {
  IPC_PTY_DATA,
  IPC_PTY_EXIT,
  IPC_STATUS_CHANGED,
  IPC_WINDOW_MAXIMIZED_CHANGED,
  IPC_EXTERNAL_SESSION_NEW,
  IPC_EXTERNAL_SESSION_STATUS,
  IPC_EXTERNAL_SESSION_REMOVED
} from '../shared/constants'

// Prevent multiple instances - check early before initializing anything
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

// Initialize all managers
const settingsManager = new SettingsManager()
const ptyManager = new PtyManager()
const statusDetector = new StatusDetector()
const sessionManager = new SessionManager(ptyManager, statusDetector, settingsManager)
const notificationManager = new NotificationManager(settingsManager)
const trayManager = new TrayManager()
const windowManager = new WindowManager(settingsManager)
const gitService = new GitService()
const statsService = new StatsService()
const updaterService = new UpdaterService()

// Phase 7: External session scanner + hook server
const externalScanner = new ExternalSessionScanner(() => ptyManager.getInternalPids())
const hookServer = new HookServer()

// Helper to send events to the renderer
function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = windowManager.getWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

// Wire up PTY events to renderer
ptyManager.on('data', (sessionId: string, data: string) => {
  sendToRenderer(IPC_PTY_DATA, { sessionId, data })
  statusDetector.onDataReceived(sessionId)
})

ptyManager.on('exit', (sessionId: string, exitCode: number, signal?: number) => {
  sendToRenderer(IPC_PTY_EXIT, { sessionId, exitCode, signal })
  statusDetector.onProcessExited(sessionId, exitCode)
})

// Wire up status change events
statusDetector.on('statusChanged', (sessionId: string, oldStatus: string, newStatus: string, runningDurationMs: number) => {
  sendToRenderer(IPC_STATUS_CHANGED, {
    sessionId,
    oldStatus,
    newStatus,
    runningDurationMs
  })

  const session = sessionManager.getSession(sessionId)
  if (session) {
    notificationManager.trySendNotification(
      sessionId,
      session.name,
      newStatus as 'idle' | 'running' | 'waiting' | 'exited' | 'error',
      runningDurationMs
    )

    if (oldStatus === 'running' && runningDurationMs > 0) {
      statsService.trackActivity(runningDurationMs)
    }
  }

  const sessions = sessionManager.listSessions()
  trayManager.update(sessions.length)
})

// Handle notification click
notificationManager.onNotificationClicked((sessionId: string) => {
  windowManager.bringToFront()
  sendToRenderer('notification:focusSession', sessionId)
})

// Wire up external session scanner events
externalScanner.on('new-session', (session) => {
  sendToRenderer(IPC_EXTERNAL_SESSION_NEW, session)
  // Send notification for new external session detected
  const total = externalScanner.getSessions().filter((s) => s.status === 'running').length
  trayManager.update(sessionManager.listSessions().length + total)
})

externalScanner.on('status-change', (session) => {
  sendToRenderer(IPC_EXTERNAL_SESSION_STATUS, session)

  // Notify when external session completes
  if (session.status === 'done') {
    notificationManager.trySendNotification(
      `ext-${session.claudePid}`,
      `${session.name} [外部]`,
      'idle',
      10001 // Force past threshold
    )
  }
})

externalScanner.on('removed', (pid) => {
  sendToRenderer(IPC_EXTERNAL_SESSION_REMOVED, { pid })
})

// Wire up hook server (receives Stop hook reports from external sessions)
hookServer.on('session-done', ({ pid, cwd }: { pid: number; cwd: string }) => {
  // Try to match by PID first, then by cwd
  const sessions = externalScanner.getSessions()
  const match = sessions.find((s) => s.claudePid === pid) ||
    sessions.find((s) => s.cwd && cwd && s.cwd.toLowerCase() === cwd.toLowerCase())

  if (match) {
    externalScanner.markDone(match.claudePid)
  }
})

// App lifecycle
app.whenReady().then(() => {
  registerAllIpcHandlers({
    sessionManager,
    ptyManager,
    notificationManager,
    settingsManager,
    gitService,
    statsService,
    updaterService,
    windowManager,
    trayManager,
    externalScanner
  })

  const mainWindow = windowManager.createMainWindow()

  mainWindow.on('maximize', () => {
    sendToRenderer(IPC_WINDOW_MAXIMIZED_CHANGED, true)
  })
  mainWindow.on('unmaximize', () => {
    sendToRenderer(IPC_WINDOW_MAXIMIZED_CHANGED, false)
  })

  // Initialize tray
  trayManager.init()
  trayManager.onAction((action) => {
    if (action === 'show') {
      windowManager.bringToFront()
    } else if (action === 'quit') {
      app.quit()
    }
  })

  // Start external session scanning and hook server
  externalScanner.start(3000)
  hookServer.start()
})

if (gotTheLock) {
  app.on('second-instance', () => {
    windowManager.bringToFront()
  })
}

// Cleanup on quit
app.on('before-quit', () => {
  windowManager.saveState()
  ptyManager.destroyAll()
  statusDetector.destroyAll()
  externalScanner.stop()
  hookServer.stop()
  trayManager.destroy()
})

app.on('window-all-closed', () => {
  app.quit()
})
