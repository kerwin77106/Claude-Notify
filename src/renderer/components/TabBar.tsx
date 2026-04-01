import React from 'react'
import StatusIndicator from './StatusIndicator'
import type { SessionInfo } from '../types/electron'

interface TabBarProps {
  sessions: SessionInfo[]
  activeSessionId: string | null
  onSelectTab: (sessionId: string) => void
  onCloseTab: (sessionId: string) => void
}

const TabBar: React.FC<TabBarProps> = ({ sessions, activeSessionId, onSelectTab, onCloseTab }) => {
  if (sessions.length === 0) return null

  return (
    <div className="flex items-center bg-[#16213e] border-b border-[#0f3460] overflow-x-auto select-none">
      {sessions.map((session) => {
        const isActive = session.sessionId === activeSessionId
        return (
          <div
            key={session.sessionId}
            className={`
              group flex items-center gap-2 px-4 py-2 text-sm cursor-pointer
              border-r border-[#0f3460] min-w-0 max-w-[200px]
              transition-colors duration-150
              ${isActive
                ? 'bg-[#1a1a2e] text-[#e0e0e0] border-b-2 border-b-blue-400'
                : 'text-[#888888] hover:text-[#e0e0e0] hover:bg-[#1a1a2e]/50'
              }
            `}
            onClick={() => onSelectTab(session.sessionId)}
          >
            <StatusIndicator status={session.status} size="sm" />
            <span className="truncate">{session.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(session.sessionId)
              }}
              className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#0f3460] text-[#888888] hover:text-red-400 transition-all"
              title="Close"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default TabBar
