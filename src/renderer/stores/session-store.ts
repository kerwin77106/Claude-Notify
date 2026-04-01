import { create } from 'zustand'
import type { SessionInfo } from '../types/electron'

interface SessionState {
  sessions: SessionInfo[]
  activeSessionId: string | null
  setSessions: (sessions: SessionInfo[]) => void
  addSession: (session: SessionInfo) => void
  removeSession: (sessionId: string) => void
  setActiveSession: (sessionId: string | null) => void
  updateStatus: (sessionId: string, status: SessionInfo['status'], runningDurationMs?: number) => void
  renameSession: (sessionId: string, newName: string) => void
  reorderSessions: (orderedIds: string[]) => void
  updateSession: (sessionId: string, partial: Partial<SessionInfo>) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  activeSessionId: null,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    })),

  removeSession: (sessionId) =>
    set((state) => {
      const filtered = state.sessions.filter((s) => s.id !== sessionId)
      let nextActive = state.activeSessionId
      if (state.activeSessionId === sessionId) {
        // Switch to the previous or next session
        const idx = state.sessions.findIndex((s) => s.id === sessionId)
        if (filtered.length > 0) {
          nextActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null
        } else {
          nextActive = null
        }
      }
      return { sessions: filtered, activeSessionId: nextActive }
    }),

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  updateStatus: (sessionId, status, runningDurationMs) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, status, ...(runningDurationMs !== undefined ? { runningDurationMs } : {}) }
          : s
      ),
    })),

  renameSession: (sessionId, newName) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, name: newName } : s
      ),
    })),

  reorderSessions: (orderedIds) =>
    set((state) => {
      const map = new Map(state.sessions.map((s) => [s.id, s]))
      const reordered = orderedIds
        .map((id) => map.get(id))
        .filter((s): s is SessionInfo => s !== undefined)
      return { sessions: reordered }
    }),

  updateSession: (sessionId, partial) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...partial } : s
      ),
    })),
}))
