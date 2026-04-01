import { useCallback, useEffect } from 'react'
import { useSessionStore } from '../stores/session-store'
import { useTerminal } from './useTerminal'
import type { SessionInfo } from '../types/electron'

export function useSession() {
  const {
    sessions,
    activeSessionId,
    addSession,
    removeSession,
    setActiveSession,
    updateStatus,
    setSessions,
  } = useSessionStore()

  const { destroyTerminal } = useTerminal()

  // Load existing sessions on mount
  const loadSessions = useCallback(async () => {
    try {
      const list = await window.electronAPI.session.list()
      setSessions(list)
      if (list.length > 0 && !activeSessionId) {
        setActiveSession(list[0].id)
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [setSessions, setActiveSession, activeSessionId])

  // Create a new session
  const createSession = useCallback(async () => {
    const result = await window.electronAPI.dialog.selectFolder()
    if (result.canceled || !result.folderPath) return null

    const folderName = result.folderPath.split(/[/\\]/).pop() || 'terminal'

    try {
      // Main process generates the sessionId and returns the full Session object
      const session = await window.electronAPI.pty.create({
        cwd: result.folderPath,
        cols: 80,
        rows: 24,
      })

      // Use the session returned by Main (which contains the Main-generated id)
      addSession({ ...session, name: session.name || folderName })
      return session
    } catch (err) {
      console.error('Failed to create session:', err)
      return null
    }
  }, [addSession])

  // Close a session
  const closeSession = useCallback(
    async (id: string) => {
      try {
        await window.electronAPI.pty.kill(id)
      } catch (err) {
        console.error('Failed to kill PTY:', err)
      }
      destroyTerminal(id)
      removeSession(id)
    },
    [destroyTerminal, removeSession]
  )

  // Rename a session
  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      const store = useSessionStore.getState()
      store.renameSession(sessionId, newName)
      try {
        await window.electronAPI.session.rename(sessionId, newName)
      } catch (err) {
        console.error('Failed to rename session:', err)
      }
    },
    []
  )

  // Reorder sessions
  const reorderSessions = useCallback(async (orderedIds: string[]) => {
    const store = useSessionStore.getState()
    store.reorderSessions(orderedIds)
    try {
      await window.electronAPI.session.reorder(orderedIds)
    } catch (err) {
      console.error('Failed to reorder sessions:', err)
    }
  }, [])

  // Export session
  const exportSession = useCallback(async (sessionId: string) => {
    try {
      const result = await window.electronAPI.session.export(sessionId)
      return result
    } catch (err) {
      console.error('Failed to export session:', err)
      return { success: false }
    }
  }, [])

  // Listen for status changes from main process
  useEffect(() => {
    const unsub = window.electronAPI.session.onStatusChange((event) => {
      updateStatus(
        event.sessionId,
        event.newStatus as SessionInfo['status'],
        event.runningDurationMs
      )
    })
    return unsub
  }, [updateStatus])

  return {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    closeSession,
    renameSession,
    reorderSessions,
    exportSession,
    loadSessions,
  }
}
