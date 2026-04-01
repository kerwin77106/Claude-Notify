import { create } from 'zustand'

export interface ExternalSession {
  sessionId: string
  pid: number
  cwd: string
  name: string
  hwnd: number
  status: 'running' | 'done' | 'exited'
  startedAt: number
  doneAt?: number
  stopCount: number
}

interface ExternalStore {
  sessions: ExternalSession[]
  setSessions: (sessions: ExternalSession[]) => void
  addSession: (session: ExternalSession) => void
  updateSession: (session: ExternalSession) => void
  removeSession: (sessionId: string) => void
}

export const useExternalStore = create<ExternalStore>((set) => ({
  sessions: [],

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => {
      if (state.sessions.some((s) => s.sessionId === session.sessionId)) return state
      return { sessions: [...state.sessions, session] }
    }),

  updateSession: (session) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.sessionId === session.sessionId ? { ...s, ...session } : s
      ),
    })),

  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
    })),
}))
