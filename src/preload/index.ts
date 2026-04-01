import { contextBridge, ipcRenderer } from 'electron'
import type {
  CreateSessionOptions,
  PtyDataEvent,
  PtyExitEvent,
  StatusChangeEvent
} from '../shared/types'
import {
  IPC_SESSION_CREATE,
  IPC_SESSION_LIST,
  IPC_SESSION_CLOSE,
  IPC_SESSION_RENAME,
  IPC_SESSION_REORDER,
  IPC_SESSION_EXPORT,
  IPC_PTY_WRITE,
  IPC_PTY_RESIZE,
  IPC_PTY_DATA,
  IPC_PTY_EXIT,
  IPC_STATUS_CHANGED,
  IPC_DIALOG_SELECT_FOLDER,
  IPC_NOTIFICATION_FOCUS_SESSION,
  IPC_NOTIFICATION_GET_HISTORY,
  IPC_NOTIFICATION_CLEAR_HISTORY,
  IPC_SETTINGS_GET,
  IPC_SETTINGS_SET,
  IPC_SETTINGS_RESET,
  IPC_GIT_DIFF_STAT,
  IPC_STATS_GET,
  IPC_UPDATER_CHECK,
  IPC_APP_GET_VERSION,
  IPC_UPDATER_STATUS,
  IPC_WINDOW_STATE,
  IPC_WINDOW_SET_TITLE,
  IPC_WINDOW_STATE_CHANGE,
  IPC_TRAY_UPDATE,
  IPC_TRAY_ACTION
} from '../shared/constants'

// Helper to create a disposable event listener
function createListener<T>(channel: string, callback: (data: T) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data)
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  pty: {
    create: (params: { cwd: string; cols: number; rows: number }) =>
      ipcRenderer.invoke(IPC_SESSION_CREATE, params as CreateSessionOptions),

    write: (sessionId: string, data: string) =>
      ipcRenderer.send(IPC_PTY_WRITE, { sessionId, data }),

    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send(IPC_PTY_RESIZE, { sessionId, cols, rows }),

    kill: (sessionId: string) =>
      ipcRenderer.invoke(IPC_SESSION_CLOSE, { sessionId }),

    onData: (callback: (event: PtyDataEvent) => void): (() => void) =>
      createListener<PtyDataEvent>(IPC_PTY_DATA, callback),

    onExit: (callback: (event: PtyExitEvent) => void): (() => void) =>
      createListener<PtyExitEvent>(IPC_PTY_EXIT, callback),
  },

  session: {
    list: () =>
      ipcRenderer.invoke(IPC_SESSION_LIST),

    rename: (sessionId: string, newName: string) =>
      ipcRenderer.invoke(IPC_SESSION_RENAME, { sessionId, newName }),

    reorder: (orderedSessionIds: string[]) =>
      ipcRenderer.invoke(IPC_SESSION_REORDER, { orderedSessionIds }),

    export: (sessionId: string) =>
      ipcRenderer.invoke(IPC_SESSION_EXPORT, { sessionId }),

    onStatusChange: (callback: (event: StatusChangeEvent) => void): (() => void) =>
      createListener<StatusChangeEvent>(IPC_STATUS_CHANGED, callback),
  },

  dialog: {
    selectFolder: () =>
      ipcRenderer.invoke(IPC_DIALOG_SELECT_FOLDER),
  },

  notification: {
    onClicked: (callback: (event: { sessionId: string }) => void): (() => void) =>
      createListener<{ sessionId: string }>(IPC_NOTIFICATION_FOCUS_SESSION, callback),

    getHistory: (limit?: number, offset?: number) =>
      ipcRenderer.invoke(IPC_NOTIFICATION_GET_HISTORY, { limit, offset }),
  },

  settings: {
    get: (key?: string) =>
      ipcRenderer.invoke(IPC_SETTINGS_GET, { key }),

    set: (key: string, value: unknown) =>
      ipcRenderer.invoke(IPC_SETTINGS_SET, { key, value }),
  },

  window: {
    state: (action: string) =>
      ipcRenderer.invoke(IPC_WINDOW_STATE, { action }),

    setTitle: (title: string) =>
      ipcRenderer.send(IPC_WINDOW_SET_TITLE, { title }),

    onStateChange: (callback: (data: { isMaximized: boolean }) => void): (() => void) =>
      createListener<{ isMaximized: boolean }>(IPC_WINDOW_STATE_CHANGE, callback),
  },

  git: {
    diffStat: (cwd: string) =>
      ipcRenderer.invoke(IPC_GIT_DIFF_STAT, { cwd }),
  },

  stats: {
    get: (period?: string) =>
      ipcRenderer.invoke(IPC_STATS_GET, { period }),
  },

  tray: {
    update: (tooltip: string, count: number) =>
      ipcRenderer.send(IPC_TRAY_UPDATE, { tooltip, activeSessionCount: count }),

    onAction: (callback: (action: string) => void): (() => void) =>
      createListener<string>(IPC_TRAY_ACTION, callback),
  },

  updater: {
    check: () =>
      ipcRenderer.invoke(IPC_UPDATER_CHECK),

    getVersion: () =>
      ipcRenderer.invoke(IPC_APP_GET_VERSION),

    onStatus: (callback: (data: { status: string; info?: unknown }) => void): (() => void) =>
      createListener<{ status: string; info?: unknown }>(IPC_UPDATER_STATUS, callback),
  },
})
