import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'path'

type TrayAction = 'show' | 'quit'

export class TrayManager {
  private tray: Tray | null = null
  private onActionCallback: ((action: TrayAction) => void) | null = null

  // Initialize the system tray
  init(): void {
    // Create a simple 16x16 tray icon (will use default if not found)
    const iconPath = path.join(__dirname, '../../resources/icon.png')
    let icon: Electron.NativeImage

    try {
      icon = nativeImage.createFromPath(iconPath)
      if (icon.isEmpty()) {
        icon = nativeImage.createEmpty()
      }
    } catch {
      icon = nativeImage.createEmpty()
    }

    this.tray = new Tray(icon)
    this.tray.setToolTip('Claude Notify')

    this.updateContextMenu()

    // Double-click to show window
    this.tray.on('double-click', () => {
      this.onActionCallback?.('show')
    })
  }

  // Update the tray context menu
  update(sessionCount: number = 0): void {
    if (!this.tray) return

    this.tray.setToolTip(
      sessionCount > 0
        ? `Claude Notify - ${sessionCount} session(s)`
        : 'Claude Notify'
    )

    this.updateContextMenu()
  }

  // Destroy the tray
  destroy(): void {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }

  // Set action callback
  onAction(callback: (action: TrayAction) => void): void {
    this.onActionCallback = callback
  }

  private updateContextMenu(): void {
    if (!this.tray) return

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Window',
        click: () => {
          this.onActionCallback?.('show')
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          this.onActionCallback?.('quit')
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }
}
