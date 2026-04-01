import { create } from 'zustand'

export interface ExternalSession {
  claudePid: number
  parentPid: number
  cwd: string
  name: string
  status: 'running' | 'done' | 'exited'
  detectedAt: number
  doneAt?: number
}

interface ExternalStore {
  sessions: ExternalSession[]
  setSessions: (sessions: ExternalSession[]) => void
  addSession: (session: ExternalSession) => void
  updateSession: (session: ExternalSession) => void
  removeSession: (pid: number) => void
}

export const useExternalStore = create<ExternalStore>((set) => ({
  sessions: [],

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => {
      // Avoid duplicates
      if (state.sessions.some((s) => s.claudePid === session.claudePid)) return state
      return { sessions: [...state.sessions, session] }
    }),

  updateSession: (session) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.claudePid === session.claudePid ? { ...s, ...session } : s
      ),
    })),

  removeSession: (pid) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.claudePid !== pid),
    })),
}))
