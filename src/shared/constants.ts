// IPC Channel constants shared between main and renderer processes

// Session management channels
export const IPC_SESSION_CREATE = 'session:create'
export const IPC_SESSION_LIST = 'session:list'
export const IPC_SESSION_CLOSE = 'session:close'
export const IPC_SESSION_RENAME = 'session:rename'
export const IPC_SESSION_REORDER = 'session:reorder'
export const IPC_SESSION_EXPORT = 'session:export'

// PTY channels
export const IPC_PTY_WRITE = 'pty:write'
export const IPC_PTY_RESIZE = 'pty:resize'
export const IPC_PTY_DATA = 'pty:data'
export const IPC_PTY_EXIT = 'pty:exit'

// Status channels
export const IPC_STATUS_CHANGED = 'status:changed'

// Notification channels
export const IPC_NOTIFICATION_GET_HISTORY = 'notification:getHistory'
export const IPC_NOTIFICATION_CLEAR_HISTORY = 'notification:clearHistory'
export const IPC_NOTIFICATION_CLICKED = 'notification:clicked'
export const IPC_NOTIFICATION_FOCUS_SESSION = 'notification:focusSession'

// Settings channels
export const IPC_SETTINGS_GET = 'settings:get'
export const IPC_SETTINGS_SET = 'settings:set'
export const IPC_SETTINGS_RESET = 'settings:reset'

// Dialog channels
export const IPC_DIALOG_SELECT_FOLDER = 'dialog:select-folder'

// Git channels
export const IPC_GIT_DIFF_STAT = 'git:diffStat'

// Stats channels
export const IPC_STATS_GET = 'stats:get'

// Updater channels
export const IPC_UPDATER_CHECK = 'updater:check'
export const IPC_APP_GET_VERSION = 'app:get-version'
export const IPC_UPDATER_STATUS = 'updater:status'

// Window channels
export const IPC_WINDOW_MINIMIZE = 'window:minimize'
export const IPC_WINDOW_MAXIMIZE = 'window:maximize'
export const IPC_WINDOW_CLOSE = 'window:close'
export const IPC_WINDOW_IS_MAXIMIZED = 'window:isMaximized'
export const IPC_WINDOW_MAXIMIZED_CHANGED = 'window:maximizedChanged'
export const IPC_WINDOW_STATE = 'window:state'
export const IPC_WINDOW_SET_TITLE = 'window:set-title'
export const IPC_WINDOW_STATE_CHANGE = 'window:stateChange'

// Tray channels
export const IPC_TRAY_UPDATE = 'tray:update'
export const IPC_TRAY_ACTION = 'tray:action'
