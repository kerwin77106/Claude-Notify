import React from 'react'
import TerminalComponent from './Terminal'
import { useUIStore } from '../stores/ui-store'

const SplitView: React.FC = () => {
  const splitViewSessionIds = useUIStore((s) => s.splitViewSessionIds)

  if (!splitViewSessionIds) return null

  const [leftId, rightId] = splitViewSessionIds

  return (
    <div className="flex w-full h-full">
      {/* Left terminal */}
      <div className="flex-1 h-full border-r border-[#0f3460]">
        <TerminalComponent sessionId={leftId} isActive={true} />
      </div>

      {/* Right terminal */}
      <div className="flex-1 h-full">
        <TerminalComponent sessionId={rightId} isActive={true} />
      </div>
    </div>
  )
}

export default SplitView
