import { app, BrowserWindow } from 'electron'
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
import { registerAllIpcHandlers } from './ipc-handler'
import {
  IPC_PTY_DATA,
  IPC_PTY_EXIT,
  IPC_STATUS_CHANGED,
  IPC_WINDOW_MAXIMIZED_CHANGED
} from '../shared/constants'

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

  // Try to send notification on status change
  const session = sessionManager.getSession(sessionId)
  if (session) {
    notificationManager.trySendNotification(
      sessionId,
      session.name,
      newStatus as 'idle' | 'running' | 'waiting' | 'exited' | 'error',
      runningDurationMs
    )

    // Track running time when transitioning away from running
    if (oldStatus === 'running' && runningDurationMs > 0) {
      statsService.trackActivity(runningDurationMs)
    }
  }

  // Update tray with session count
  const sessions = sessionManager.listSessions()
  trayManager.update(sessions.length)
})

// Handle notification click - bring window to front and focus session
notificationManager.onNotificationClicked((sessionId: string) => {
  windowManager.bringToFront()
  sendToRenderer('notification:focusSession', sessionId)
})

// App lifecycle
app.whenReady().then(() => {
  // Register all IPC handlers
  registerAllIpcHandlers({
    sessionManager,
    ptyManager,
    notificationManager,
    settingsManager,
    gitService,
    statsService,
    updaterService,
    windowManager,
    trayManager
  })

  // Create the main window
  const mainWindow = windowManager.createMainWindow()

  // Forward maximize/unmaximize events to renderer
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
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    windowManager.bringToFront()
  })
}

// Cleanup on quit
app.on('before-quit', () => {
  windowManager.saveState()
  ptyManager.destroyAll()
  statusDetector.destroyAll()
  trayManager.destroy()
})

// Windows: quit when all windows are closed
app.on('window-all-closed', () => {
  app.quit()
})
