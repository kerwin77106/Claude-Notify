import { useEffect } from 'react'
import { useSessionStore } from '../stores/session-store'
import { useUIStore } from '../stores/ui-store'

interface UseKeyboardOptions {
  onCreateSession: () => void
  onCloseSession: (sessionId: string) => void
}

export function useKeyboard({ onCreateSession, onCloseSession }: UseKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl+T: Create new session
      if (ctrl && e.key === 't') {
        e.preventDefault()
        onCreateSession()
        return
      }

      // Ctrl+W: Close active session
      if (ctrl && e.key === 'w') {
        e.preventDefault()
        const activeId = useSessionStore.getState().activeSessionId
        if (activeId) {
          onCloseSession(activeId)
        }
        return
      }

      // Ctrl+F: Toggle search bar
      if (ctrl && e.key === 'f') {
        e.preventDefault()
        useUIStore.getState().toggleSearchBar()
        return
      }

      // Ctrl+,: Toggle settings
      if (ctrl && e.key === ',') {
        e.preventDefault()
        useUIStore.getState().toggleSettingsPanel()
        return
      }

      // Ctrl+P: Toggle command palette
      if (ctrl && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
        return
      }

      // Ctrl+Tab: Switch to next tab
      if (ctrl && e.key === 'Tab') {
        e.preventDefault()
        const state = useSessionStore.getState()
        if (state.sessions.length <= 1) return
        const currentIdx = state.sessions.findIndex(
          (s) => s.sessionId === state.activeSessionId
        )
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + state.sessions.length) % state.sessions.length
          : (currentIdx + 1) % state.sessions.length
        state.setActiveSession(state.sessions[nextIdx].sessionId)
        return
      }

      // Ctrl+1~9: Switch to tab by index
      if (ctrl && e.key >= '1' && e.key <= '9') {
        e.preventDefault()
        const idx = parseInt(e.key) - 1
        const state = useSessionStore.getState()
        if (idx < state.sessions.length) {
          state.setActiveSession(state.sessions[idx].sessionId)
        }
        return
      }

      // Escape: Close panels
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        if (ui.searchBarOpen) ui.setSearchBarOpen(false)
        else if (ui.commandPaletteOpen) ui.toggleCommandPalette()
        else if (ui.settingsPanelOpen) ui.setSettingsPanelOpen(false)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCreateSession, onCloseSession])
}
