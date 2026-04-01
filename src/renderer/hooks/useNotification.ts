import { useEffect } from 'react'
import { useSessionStore } from '../stores/session-store'

export function useNotification() {
  const setActiveSession = useSessionStore((s) => s.setActiveSession)

  useEffect(() => {
    // When a notification is clicked, switch to the corresponding session
    const unsub = window.electronAPI.notification.onClicked((event) => {
      setActiveSession(event.sessionId)
    })

    return unsub
  }, [setActiveSession])
}
