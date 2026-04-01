import { useEffect, useCallback } from 'react'
import { useExternalStore, ExternalSession } from '../stores/external-store'

export function useExternalSessions() {
  const { sessions, setSessions, addSession, updateSession } = useExternalStore()

  // Load existing external sessions on mount
  const loadExternalSessions = useCallback(async () => {
    try {
      const list = await (window as any).electronAPI.external.list()
      setSessions(list || [])
    } catch {
      // External API might not be available
    }
  }, [setSessions])

  // Focus an external session's window via HWND
  const focusExternalSession = useCallback(async (sessionId: string) => {
    try {
      await (window as any).electronAPI.external.focus(sessionId)
    } catch (err) {
      console.error('Failed to focus external session:', err)
    }
  }, [])

  // Listen for hook-server events
  useEffect(() => {
    const api = (window as any).electronAPI.external
    if (!api) return

    const unsubNew = api.onNew((session: ExternalSession) => {
      addSession(session)
    })

    const unsubStatus = api.onStatusChange((session: ExternalSession) => {
      updateSession(session)
    })

    const unsubRemoved = api.onRemoved(({ sessionId }: { sessionId: string }) => {
      useExternalStore.getState().removeSession(sessionId)
    })

    loadExternalSessions()

    return () => {
      unsubNew()
      unsubStatus()
      unsubRemoved()
    }
  }, [addSession, updateSession, loadExternalSessions])

  return {
    externalSessions: sessions,
    focusExternalSession,
  }
}
