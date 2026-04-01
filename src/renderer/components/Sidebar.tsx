import React, { useState, useRef } from 'react'
import StatusIndicator from './StatusIndicator'
import { useDragDrop } from '../hooks/useDragDrop'
import { useUIStore } from '../stores/ui-store'
import { useExternalSessions } from '../hooks/useExternalSessions'
import type { SessionInfo } from '../types/electron'

interface SidebarProps {
  sessions: SessionInfo[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onRenameSession: (sessionId: string, newName: string) => void
  onReorderSessions: (orderedIds: string[]) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onReorderSessions,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel)
  const toggleNotificationHistory = useUIStore((s) => s.toggleNotificationHistory)
  const toggleStatsPanel = useUIStore((s) => s.toggleStatsPanel)

  const { externalSessions, focusExternalSession } = useExternalSessions()
  const sessionIds = sessions.map((s) => s.sessionId)

  const { handleDragStart, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handleDragEnd } =
    useDragDrop({
      onReorder: onReorderSessions,
    })

  const handleDoubleClick = (session: SessionInfo) => {
    setEditingId(session.sessionId)
    setEditValue(session.name)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleRenameSubmit = (sessionId: string) => {
    if (editValue.trim()) {
      onRenameSession(sessionId, editValue.trim())
    }
    setEditingId(null)
  }

  return (
    <div
      className="flex flex-col h-full bg-[#16213e] border-r border-[#0f3460] select-none"
      style={{ width: sidebarWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#0f3460]">
        <span className="text-sm font-semibold text-[#e0e0e0]">Sessions</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleNotificationHistory}
            className="p-1.5 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
            title="Notifications"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button
            onClick={toggleStatsPanel}
            className="p-1.5 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
            title="Stats"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={toggleSettingsPanel}
            className="p-1.5 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
            title="Settings (Ctrl+,)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.map((session) => {
          const isActive = session.sessionId === activeSessionId
          const isEditing = editingId === session.sessionId

          return (
            <div
              key={session.sessionId}
              draggable
              onDragStart={(e) => handleDragStart(e, session.sessionId)}
              onDragEnter={(e) => handleDragEnter(e, session.sessionId)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, sessionIds)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSession(session.sessionId)}
              onDoubleClick={() => handleDoubleClick(session)}
              className={`
                flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors
                ${isActive ? 'bg-[#0f3460] text-[#e0e0e0]' : 'text-[#888888] hover:bg-[#0f3460]/40 hover:text-[#e0e0e0]'}
              `}
            >
              <StatusIndicator status={session.status} />
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(session.sessionId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(session.sessionId)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="w-full px-1 py-0 bg-[#1a1a2e] border border-blue-400 rounded text-sm text-[#e0e0e0] focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="text-sm truncate">{session.name}</div>
                    <div className="text-xs text-[#888888] truncate">{session.cwd}</div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* External sessions section */}
      {externalSessions.length > 0 && (
        <div className="border-t border-[#0f3460]">
          <div className="px-4 py-1.5 text-xs text-[#888888] uppercase tracking-wider">
            外部偵測
          </div>
          {externalSessions.map((ext) => {
            const statusColor =
              ext.status === 'running' ? 'bg-emerald-400' :
              ext.status === 'done' ? 'bg-amber-400' : 'bg-gray-500'

            return (
              <div
                key={ext.claudePid}
                onClick={() => focusExternalSession(ext.claudePid)}
                className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-[#888888] hover:bg-[#0f3460]/40 hover:text-[#e0e0e0] transition-colors"
                title={`PID: ${ext.claudePid} — 點擊跳轉到 PowerShell 視窗`}
              >
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate flex items-center gap-1.5">
                    {ext.name}
                    <span className="text-[10px] px-1 py-0.5 rounded bg-[#0f3460] text-[#60a5fa]">外部</span>
                  </div>
                  <div className="text-xs text-[#888888] truncate">{ext.cwd || `PID: ${ext.claudePid}`}</div>
                </div>
                <svg className="w-3.5 h-3.5 text-[#888888] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="跳轉">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            )
          })}
        </div>
      )}

      {/* New session button */}
      <div className="border-t border-[#0f3460] p-2">
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-[#888888] hover:text-[#e0e0e0] hover:bg-[#0f3460] rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>
    </div>
  )
}

export default Sidebar
