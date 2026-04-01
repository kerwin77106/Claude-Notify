import { BrowserWindow, shell } from 'electron'
import path from 'path'
import type { SettingsManager } from './settings-manager'

export class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private settingsManager: SettingsManager

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager
  }

  // Create the main application window
  createMainWindow(): BrowserWindow {
    const settings = this.settingsManager.get()
    const { width, height, x, y, isMaximized } = settings.window

    this.mainWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      titleBarStyle: 'hidden',
      backgroundColor: settings.theme === 'dark' ? '#1a1a2e' : '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    })

    if (isMaximized) {
      this.mainWindow.maximize()
    }

    // Open external links in browser
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // Save window state on move/resize
    this.mainWindow.on('resized', () => this.saveState())
    this.mainWindow.on('moved', () => this.saveState())
    this.mainWindow.on('maximize', () => this.saveState())
    this.mainWindow.on('unmaximize', () => this.saveState())

    // Load the renderer
    if (process.env.ELECTRON_RENDERER_URL) {
      this.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    return this.mainWindow
  }

  // Save current window state to settings
  saveState(): void {
    if (!this.mainWindow) return

    const isMaximized = this.mainWindow.isMaximized()
    const bounds = this.mainWindow.getBounds()

    this.settingsManager.set({
      window: {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized
      }
    })
  }

  // Bring the window to front
  bringToFront(): void {
    if (!this.mainWindow) return

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore()
    }
    this.mainWindow.show()
    this.mainWindow.focus()
  }

  // Get the main window instance
  getWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  // Check if window is maximized
  isMaximized(): boolean {
    return this.mainWindow?.isMaximized() ?? false
  }
}
