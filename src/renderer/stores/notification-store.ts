import { create } from 'zustand'
import type { NotificationRecord } from '../types/electron'

interface NotificationState {
  notifications: NotificationRecord[]
  total: number
  loading: boolean
  loadHistory: (limit?: number, offset?: number) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  total: 0,
  loading: false,

  loadHistory: async (limit = 50, offset = 0) => {
    set({ loading: true })
    try {
      const result = await window.electronAPI.notification.getHistory(limit, offset)
      set({
        notifications: result.records,
        total: result.total,
        loading: false,
      })
    } catch (err) {
      console.error('Failed to load notification history:', err)
      set({ loading: false })
    }
  },
}))
