import { ipcMain, BrowserWindow, app } from 'electron'
import type { CreateSessionOptions, AppSettings } from '../shared/types'
import {
  IPC_SESSION_CREATE,
  IPC_SESSION_LIST,
  IPC_SESSION_CLOSE,
  IPC_SESSION_RENAME,
  IPC_SESSION_REORDER,
  IPC_SESSION_EXPORT,
  IPC_PTY_WRITE,
  IPC_PTY_RESIZE,
  IPC_NOTIFICATION_GET_HISTORY,
  IPC_NOTIFICATION_CLEAR_HISTORY,
  IPC_SETTINGS_GET,
  IPC_SETTINGS_SET,
  IPC_SETTINGS_RESET,
  IPC_DIALOG_SELECT_FOLDER,
  IPC_GIT_DIFF_STAT,
  IPC_STATS_GET,
  IPC_UPDATER_CHECK,
  IPC_APP_GET_VERSION,
  IPC_WINDOW_STATE,
  IPC_WINDOW_SET_TITLE,
  IPC_TRAY_UPDATE,
  IPC_TRAY_ACTION,
  IPC_EXTERNAL_SESSION_LIST,
  IPC_EXTERNAL_SESSION_FOCUS
} from '../shared/constants'
import type { SessionManager } from './session-manager'
import type { PtyManager } from './pty-manager'
import type { NotificationManager } from './notification-manager'
import type { SettingsManager } from './settings-manager'
import type { GitService } from './git-service'
import type { StatsService } from './stats-service'
import type { UpdaterService } from './updater-service'
import type { WindowManager } from './window-manager'
import type { TrayManager } from './tray-manager'
import type { ExternalSessionScanner } from './external-session-scanner'
import { dialog } from 'electron'

interface IpcHandlerDeps {
  sessionManager: SessionManager
  ptyManager: PtyManager
  notificationManager: NotificationManager
  settingsManager: SettingsManager
  gitService: GitService
  statsService: StatsService
  updaterService: UpdaterService
  windowManager: WindowManager
  trayManager?: TrayManager
  externalScanner?: ExternalSessionScanner
}

export function registerAllIpcHandlers(deps: IpcHandlerDeps): void {
  const {
    sessionManager,
    ptyManager,
    notificationManager,
    settingsManager,
    gitService,
    statsService,
    updaterService,
    windowManager,
    trayManager
  } = deps

  // --- Session handlers ---
  // Preload sends a single object arg; destructure accordingly.

  ipcMain.handle(IPC_SESSION_CREATE, (_event, options: CreateSessionOptions) => {
    const session = sessionManager.createSession(options)
    statsService.trackActivity(0, true)
    return session
  })

  ipcMain.handle(IPC_SESSION_LIST, () => {
    return sessionManager.listSessions()
  })

  ipcMain.handle(IPC_SESSION_CLOSE, (_event, { sessionId }: { sessionId: string }) => {
    sessionManager.closeSession(sessionId)
  })

  ipcMain.handle(IPC_SESSION_RENAME, (_event, { sessionId, newName }: { sessionId: string; newName: string }) => {
    sessionManager.renameSession(sessionId, newName)
  })

  ipcMain.handle(IPC_SESSION_REORDER, (_event, { orderedSessionIds }: { orderedSessionIds: string[] }) => {
    sessionManager.reorderSessions(orderedSessionIds)
  })

  ipcMain.handle(IPC_SESSION_EXPORT, (_event, { sessionId }: { sessionId: string }) => {
    return sessionManager.exportSession(sessionId)
  })

  // --- PTY handlers ---
  // Preload sends a single object arg via ipcRenderer.send

  ipcMain.on(IPC_PTY_WRITE, (_event, { sessionId, data }: { sessionId: string; data: string }) => {
    ptyManager.write(sessionId, data)
    statsService.trackCommand()
  })

  ipcMain.on(IPC_PTY_RESIZE, (_event, { sessionId, cols, rows }: { sessionId: string; cols: number; rows: number }) => {
    ptyManager.resize(sessionId, cols, rows)
  })

  // --- Dialog handlers ---

  ipcMain.handle(IPC_DIALOG_SELECT_FOLDER, async () => {
    const win = windowManager.getWindow()
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory']
    })
    return {
      canceled: result.canceled,
      folderPath: result.filePaths[0]
    }
  })

  // --- Notification handlers ---

  ipcMain.handle(IPC_NOTIFICATION_GET_HISTORY, (_event, _params?: { limit?: number; offset?: number }) => {
    const records = notificationManager.getHistory()
    const limit = _params?.limit ?? records.length
    const offset = _params?.offset ?? 0
    const sliced = records.slice(offset, offset + limit)
    return { records: sliced, total: records.length }
  })

  ipcMain.handle(IPC_NOTIFICATION_CLEAR_HISTORY, () => {
    notificationManager.clearHistory()
  })

  // --- Settings handlers ---

  ipcMain.handle(IPC_SETTINGS_GET, (_event, _params?: { key?: string }) => {
    const all = settingsManager.get()
    if (_params?.key) {
      return (all as Record<string, unknown>)[_params.key]
    }
    return all
  })

  ipcMain.handle(IPC_SETTINGS_SET, (_event, { key, value }: { key: string; value: unknown }) => {
    settingsManager.set({ [key]: value })
  })

  ipcMain.handle(IPC_SETTINGS_RESET, () => {
    settingsManager.reset()
  })

  // --- Git handlers ---

  ipcMain.handle(IPC_GIT_DIFF_STAT, (_event, { cwd }: { cwd: string }) => {
    return gitService.getDiffStat(cwd)
  })

  // --- Stats handlers ---

  ipcMain.handle(IPC_STATS_GET, (_event, _params?: { period?: string }) => {
    return statsService.getStats()
  })

  // --- Updater handlers ---

  ipcMain.handle(IPC_UPDATER_CHECK, () => {
    return updaterService.checkForUpdates()
  })

  ipcMain.handle(IPC_APP_GET_VERSION, () => {
    return app.getVersion()
  })

  // --- Window handlers ---

  ipcMain.handle(IPC_WINDOW_STATE, (_event, { action }: { action: string }) => {
    const win = windowManager.getWindow()
    if (!win) return
    switch (action) {
      case 'minimize':
        win.minimize()
        break
      case 'maximize':
        if (win.isMaximized()) {
          win.unmaximize()
        } else {
          win.maximize()
        }
        break
      case 'close':
        win.close()
        break
      case 'isMaximized':
        return win.isMaximized()
    }
  })

  ipcMain.on(IPC_WINDOW_SET_TITLE, (_event, { title }: { title: string }) => {
    const win = windowManager.getWindow()
    if (win) win.setTitle(title)
  })

  // --- Tray handlers ---

  ipcMain.on(IPC_TRAY_UPDATE, (_event, { tooltip, activeSessionCount }: { tooltip: string; activeSessionCount: number }) => {
    if (trayManager) {
      trayManager.update(activeSessionCount)
    }
  })

  // --- External session handlers ---

  const { externalScanner } = deps

  ipcMain.handle(IPC_EXTERNAL_SESSION_LIST, () => {
    if (!externalScanner) return []
    return externalScanner.getSessions()
  })

  ipcMain.handle(IPC_EXTERNAL_SESSION_FOCUS, (_event, { claudePid }: { claudePid: number }) => {
    if (!externalScanner) return false
    return externalScanner.bringToFront(claudePid)
  })
}
