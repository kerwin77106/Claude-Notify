import React, { useEffect, useState, useCallback } from 'react'
import { useSessionStore } from '../stores/session-store'
import type { GitDiffStat } from '../types/electron'

const GitPanel: React.FC = () => {
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const sessions = useSessionStore((s) => s.sessions)
  const [diffStat, setDiffStat] = useState<GitDiffStat | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId)

  const loadDiffStat = useCallback(async () => {
    if (!activeSession?.cwd) return

    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.git.diffStat(activeSession.cwd)
      setDiffStat(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load git info')
      setDiffStat(null)
    } finally {
      setLoading(false)
    }
  }, [activeSession?.cwd])

  useEffect(() => {
    loadDiffStat()
    // Refresh every 30 seconds
    const interval = setInterval(loadDiffStat, 30000)
    return () => clearInterval(interval)
  }, [loadDiffStat])

  return (
    <div className="w-64 h-full bg-[#16213e] border-l border-[#0f3460] flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#0f3460]">
        <span className="text-sm font-semibold text-[#e0e0e0]">Git</span>
        <button
          onClick={loadDiffStat}
          className="p-1 rounded hover:bg-[#0f3460] text-[#888888] hover:text-[#e0e0e0] transition-colors"
          title="Refresh"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-sm text-[#888888]">Loading...</div>
        )}

        {error && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        {diffStat && !loading && (
          <>
            {/* Branch */}
            <div className="mb-4">
              <span className="text-xs text-[#888888]">Branch</span>
              <div className="text-sm text-blue-400 font-mono">{diffStat.branch}</div>
            </div>

            {/* Summary */}
            <div className="mb-4 flex gap-3 text-xs">
              <span className="text-emerald-400">+{diffStat.totalInsertions}</span>
              <span className="text-red-400">-{diffStat.totalDeletions}</span>
              <span className="text-[#888888]">{diffStat.files.length} files</span>
            </div>

            {/* File list */}
            <div className="space-y-1">
              {diffStat.files.map((file) => (
                <div key={file.file} className="flex items-center justify-between text-xs py-1">
                  <span className="text-[#e0e0e0] truncate flex-1 font-mono" title={file.file}>
                    {file.file}
                  </span>
                  <div className="flex gap-2 ml-2 shrink-0">
                    {file.insertions > 0 && (
                      <span className="text-emerald-400">+{file.insertions}</span>
                    )}
                    {file.deletions > 0 && (
                      <span className="text-red-400">-{file.deletions}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {diffStat.files.length === 0 && (
              <div className="text-sm text-[#888888]">No changes</div>
            )}
          </>
        )}

        {!diffStat && !loading && !error && (
          <div className="text-sm text-[#888888]">Select a session to view git info</div>
        )}
      </div>
    </div>
  )
}

export default GitPanel
