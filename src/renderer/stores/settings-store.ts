import { create } from 'zustand'
import type { AppSettings } from '../types/electron'

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  notificationThresholdMs: 30000,
  muteStart: undefined,
  muteEnd: undefined,
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  sidebarWidth: 260,
  showGitPanel: false,
}

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const saved = await window.electronAPI.settings.get()
      set({
        settings: { ...DEFAULT_SETTINGS, ...saved },
        loaded: true,
      })
    } catch (err) {
      console.error('Failed to load settings:', err)
      set({ loaded: true })
    }
  },

  updateSetting: async (key, value) => {
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    }))
    try {
      await window.electronAPI.settings.set(key, value)
    } catch (err) {
      console.error('Failed to save setting:', key, err)
    }
  },
}))
