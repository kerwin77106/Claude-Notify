import { useEffect, useCallback } from 'react'
import { useExternalStore, ExternalSession } from '../stores/external-store'

export function useExternalSessions() {
  const { sessions, setSessions, addSession, updateSession, removeSession } = useExternalStore()

  // Load initial external sessions
  const loadExternalSessions = useCallback(async () => {
    try {
      const list = await (window as any).electronAPI.external.list()
      setSessions(list || [])
    } catch {
      // External API might not be available yet
    }
  }, [setSessions])

  // Focus (bring to front) an external session's PowerShell window
  const focusExternalSession = useCallback(async (claudePid: number) => {
    try {
      await (window as any).electronAPI.external.focus(claudePid)
    } catch (err) {
      console.error('Failed to focus external session:', err)
    }
  }, [])

  // Listen for external session events
  useEffect(() => {
    const api = (window as any).electronAPI.external
    if (!api) return

    const unsubNew = api.onNew((session: ExternalSession) => {
      addSession(session)
    })

    const unsubStatus = api.onStatusChange((session: ExternalSession) => {
      updateSession(session)
    })

    const unsubRemoved = api.onRemoved(({ pid }: { pid: number }) => {
      removeSession(pid)
    })

    // Initial load
    loadExternalSessions()

    return () => {
      unsubNew()
      unsubStatus()
      unsubRemoved()
    }
  }, [addSession, updateSession, removeSession, loadExternalSessions])

  return {
    externalSessions: sessions,
    focusExternalSession,
    loadExternalSessions,
  }
}
