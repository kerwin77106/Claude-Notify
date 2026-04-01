import React, { useEffect, useState } from 'react'
import { useUIStore } from '../stores/ui-store'
import { useStatsStore } from '../stores/stats-store'

const StatsPanel: React.FC = () => {
  const statsPanelOpen = useUIStore((s) => s.statsPanelOpen)
  const toggleStatsPanel = useUIStore((s) => s.toggleStatsPanel)
  const { stats, loading, loadStats } = useStatsStore()
  const [period, setPeriod] = useState('week')

  useEffect(() => {
    if (statsPanelOpen) {
      loadStats(period)
    }
  }, [statsPanelOpen, period, loadStats])

  if (!statsPanelOpen) return null

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={toggleStatsPanel} />

      {/* Panel */}
      <div className="w-96 h-full bg-[#16213e] border-l border-[#0f3460] overflow-hidden shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#0f3460]">
          <h2 className="text-lg font-semibold text-[#e0e0e0]">Statistics</h2>
          <button
            onClick={toggleStatsPanel}
            className="p-1 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 px-6 py-3 border-b border-[#0f3460]">
          {['day', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                period === p
                  ? 'bg-[#0f3460] text-[#e0e0e0]'
                  : 'text-[#888888] hover:text-[#e0e0e0]'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-sm text-[#888888]">Loading...</div>
          )}

          {stats && !loading && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f3460] rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#e0e0e0]">{stats.totalSessions}</div>
                  <div className="text-xs text-[#888888]">Total Sessions</div>
                </div>
                <div className="bg-[#0f3460] rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#e0e0e0]">{stats.sessionsToday}</div>
                  <div className="text-xs text-[#888888]">Today</div>
                </div>
                <div className="bg-[#0f3460] rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#e0e0e0]">{formatDuration(stats.totalRunningTime)}</div>
                  <div className="text-xs text-[#888888]">Total Running</div>
                </div>
                <div className="bg-[#0f3460] rounded-lg p-4">
                  <div className="text-2xl font-bold text-[#e0e0e0]">{formatDuration(stats.averageDuration)}</div>
                  <div className="text-xs text-[#888888]">Avg Duration</div>
                </div>
              </div>

              {/* Status breakdown */}
              {stats.byStatus && Object.keys(stats.byStatus).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-[#e0e0e0] mb-3">By Status</h3>
                  <div className="space-y-2">
                    {Object.entries(stats.byStatus).map(([status, count]) => {
                      const colorMap: Record<string, string> = {
                        running: 'bg-emerald-400',
                        idle: 'bg-amber-400',
                        exited: 'bg-gray-500',
                        starting: 'bg-blue-400',
                      }
                      const total = Object.values(stats.byStatus).reduce((a, b) => a + b, 0)
                      const pct = total > 0 ? (count / total) * 100 : 0
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#888888] capitalize">{status}</span>
                            <span className="text-[#e0e0e0]">{count}</span>
                          </div>
                          <div className="h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colorMap[status] || 'bg-gray-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!stats && !loading && (
            <div className="text-sm text-[#888888]">No statistics available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StatsPanel
