import React from 'react'
import { useSessionStore } from '../stores/session-store'

const StatusBar: React.FC = () => {
  const sessions = useSessionStore((s) => s.sessions)

  const total = sessions.length
  const running = sessions.filter((s) => s.status === 'running').length
  const idle = sessions.filter((s) => s.status === 'idle').length
  const exited = sessions.filter((s) => s.status === 'exited').length

  return (
    <div className="flex items-center justify-between px-4 py-1.5 bg-[#0f3460] text-xs text-[#888888] border-t border-[#1a1a2e] select-none">
      <div className="flex items-center gap-4">
        <span>{total} sessions</span>
        {running > 0 && (
          <span className="text-emerald-400">{running} running</span>
        )}
        {idle > 0 && (
          <span className="text-amber-400">{idle} waiting</span>
        )}
        {exited > 0 && (
          <span className="text-gray-500">{exited} done</span>
        )}
      </div>
      <div className="text-[#888888]">Claude Notify</div>
    </div>
  )
}

export default StatusBar
