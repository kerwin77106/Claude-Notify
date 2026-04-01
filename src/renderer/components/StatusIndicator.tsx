import React from 'react'

interface StatusIndicatorProps {
  status: 'starting' | 'running' | 'idle' | 'exited'
  size?: 'sm' | 'md'
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'

  const colorMap: Record<string, string> = {
    starting: 'bg-blue-400 animate-pulse',
    running: 'bg-emerald-400',
    idle: 'bg-amber-400',
    exited: 'bg-gray-500',
  }

  return (
    <span
      className={`inline-block rounded-full ${sizeClass} ${colorMap[status] || 'bg-gray-500'}`}
      title={status}
    />
  )
}

export default StatusIndicator
