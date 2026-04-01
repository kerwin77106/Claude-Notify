import { create } from 'zustand'

interface UIState {
  sidebarWidth: number
  setSidebarWidth: (width: number) => void
  splitViewEnabled: boolean
  splitViewSessionIds: [string, string] | null
  enableSplitView: (sessionIds: [string, string]) => void
  disableSplitView: () => void
  settingsPanelOpen: boolean
  toggleSettingsPanel: () => void
  setSettingsPanelOpen: (open: boolean) => void
  searchBarOpen: boolean
  toggleSearchBar: () => void
  setSearchBarOpen: (open: boolean) => void
  notificationHistoryOpen: boolean
  toggleNotificationHistory: () => void
  statsPanelOpen: boolean
  toggleStatsPanel: () => void
  commandPaletteOpen: boolean
  toggleCommandPalette: () => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarWidth: 260,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

  splitViewEnabled: false,
  splitViewSessionIds: null,
  enableSplitView: (sessionIds) =>
    set({ splitViewEnabled: true, splitViewSessionIds: sessionIds }),
  disableSplitView: () =>
    set({ splitViewEnabled: false, splitViewSessionIds: null }),

  settingsPanelOpen: false,
  toggleSettingsPanel: () => set((s) => ({ settingsPanelOpen: !s.settingsPanelOpen })),
  setSettingsPanelOpen: (open) => set({ settingsPanelOpen: open }),

  searchBarOpen: false,
  toggleSearchBar: () => set((s) => ({ searchBarOpen: !s.searchBarOpen })),
  setSearchBarOpen: (open) => set({ searchBarOpen: open }),

  notificationHistoryOpen: false,
  toggleNotificationHistory: () => set((s) => ({ notificationHistoryOpen: !s.notificationHistoryOpen })),

  statsPanelOpen: false,
  toggleStatsPanel: () => set((s) => ({ statsPanelOpen: !s.statsPanelOpen })),

  commandPaletteOpen: false,
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
}))
