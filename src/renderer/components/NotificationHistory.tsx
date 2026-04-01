import React, { useEffect } from 'react'
import { useUIStore } from '../stores/ui-store'
import { useNotificationStore } from '../stores/notification-store'
import { useSessionStore } from '../stores/session-store'

const NotificationHistory: React.FC = () => {
  const notificationHistoryOpen = useUIStore((s) => s.notificationHistoryOpen)
  const toggleNotificationHistory = useUIStore((s) => s.toggleNotificationHistory)
  const { notifications, total, loading, loadHistory } = useNotificationStore()
  const setActiveSession = useSessionStore((s) => s.setActiveSession)

  useEffect(() => {
    if (notificationHistoryOpen) {
      loadHistory()
    }
  }, [notificationHistoryOpen, loadHistory])

  if (!notificationHistoryOpen) return null

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={toggleNotificationHistory} />

      {/* Panel */}
      <div className="w-96 h-full bg-[#16213e] border-l border-[#0f3460] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0f3460]">
          <h2 className="text-lg font-semibold text-[#e0e0e0]">
            Notifications
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-[#888888]">({total})</span>
            )}
          </h2>
          <button
            onClick={toggleNotificationHistory}
            className="p-1 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-sm text-[#888888]">Loading...</div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="p-6 text-sm text-[#888888] text-center">No notifications yet</div>
          )}

          {notifications.map((n) => (
            <div
              key={n.id}
              className="px-6 py-4 border-b border-[#0f3460] hover:bg-[#0f3460]/40 cursor-pointer transition-colors"
              onClick={() => {
                setActiveSession(n.sessionId)
                toggleNotificationHistory()
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[#e0e0e0]">{n.title}</span>
                <span className="text-xs text-[#888888]">{formatTime(n.timestamp)}</span>
              </div>
              <p className="text-xs text-[#888888]">{n.body}</p>
              <div className="mt-1 text-xs text-blue-400">{n.sessionName}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default NotificationHistory
