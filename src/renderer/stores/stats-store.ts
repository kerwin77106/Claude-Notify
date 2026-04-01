import { create } from 'zustand'
import type { StatsData } from '../types/electron'

interface StatsState {
  stats: StatsData | null
  loading: boolean
  loadStats: (period?: string) => Promise<void>
}

export const useStatsStore = create<StatsState>((set) => ({
  stats: null,
  loading: false,

  loadStats: async (period = 'week') => {
    set({ loading: true })
    try {
      const data = await window.electronAPI.stats.get(period)
      set({ stats: data, loading: false })
    } catch (err) {
      console.error('Failed to load stats:', err)
      set({ loading: false })
    }
  },
}))
