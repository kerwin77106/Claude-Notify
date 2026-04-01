import Store from 'electron-store'
import type { AppSettings } from '../shared/types'

const DEFAULT_SETTINGS: AppSettings = {
  notification: {
    enabled: true,
    runningThresholdMs: 10000,
    muteStart: null,
    muteEnd: null,
    sound: true
  },
  theme: 'dark',
  window: {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  },
  general: {
    defaultCwd: process.env.USERPROFILE || 'C:\\',
    maxOutputBufferLines: 5000,
    confirmBeforeClose: true
  }
}

export class SettingsManager {
  private store: Store<{ settings: AppSettings }>

  constructor() {
    this.store = new Store<{ settings: AppSettings }>({
      name: 'settings',
      defaults: {
        settings: DEFAULT_SETTINGS
      }
    })
  }

  // Get all settings
  get(): AppSettings {
    return this.store.get('settings')
  }

  // Update settings (partial merge)
  set(partial: Partial<AppSettings>): void {
    const current = this.get()
    const merged: AppSettings = {
      ...current,
      ...partial,
      notification: {
        ...current.notification,
        ...(partial.notification ?? {})
      },
      window: {
        ...current.window,
        ...(partial.window ?? {})
      },
      general: {
        ...current.general,
        ...(partial.general ?? {})
      }
    }
    this.store.set('settings', merged)
  }

  // Get default settings
  getDefaults(): AppSettings {
    return { ...DEFAULT_SETTINGS }
  }

  // Reset to defaults
  reset(): void {
    this.store.set('settings', { ...DEFAULT_SETTINGS })
  }
}
