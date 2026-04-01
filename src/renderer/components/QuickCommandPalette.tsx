import React, { useState, useRef, useEffect, useMemo } from 'react'
import { useUIStore } from '../stores/ui-store'
import { useSessionStore } from '../stores/session-store'

interface Command {
  id: string
  label: string
  shortcut?: string
  action: () => void
}

interface QuickCommandPaletteProps {
  onCreateSession: () => void
  onCloseSession: (sessionId: string) => void
}

const QuickCommandPalette: React.FC<QuickCommandPaletteProps> = ({
  onCreateSession,
  onCloseSession,
}) => {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen)
  const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette)
  const toggleSettingsPanel = useUIStore((s) => s.toggleSettingsPanel)
  const toggleSearchBar = useUIStore((s) => s.toggleSearchBar)
  const toggleNotificationHistory = useUIStore((s) => s.toggleNotificationHistory)
  const toggleStatsPanel = useUIStore((s) => s.toggleStatsPanel)
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const sessions = useSessionStore((s) => s.sessions)
  const setActiveSession = useSessionStore((s) => s.setActiveSession)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      { id: 'new-session', label: 'New Session', shortcut: 'Ctrl+T', action: () => { onCreateSession(); toggleCommandPalette() } },
      { id: 'settings', label: 'Open Settings', shortcut: 'Ctrl+,', action: () => { toggleSettingsPanel(); toggleCommandPalette() } },
      { id: 'search', label: 'Search in Terminal', shortcut: 'Ctrl+F', action: () => { toggleSearchBar(); toggleCommandPalette() } },
      { id: 'notifications', label: 'Notification History', action: () => { toggleNotificationHistory(); toggleCommandPalette() } },
      { id: 'stats', label: 'Usage Statistics', action: () => { toggleStatsPanel(); toggleCommandPalette() } },
    ]

    if (activeSessionId) {
      cmds.push({
        id: 'close-session',
        label: 'Close Current Session',
        shortcut: 'Ctrl+W',
        action: () => { onCloseSession(activeSessionId); toggleCommandPalette() },
      })
    }

    // Add session switching commands
    sessions.forEach((session) => {
      cmds.push({
        id: `switch-${session.sessionId}`,
        label: `Switch to: ${session.name}`,
        action: () => { setActiveSession(session.sessionId); toggleCommandPalette() },
      })
    })

    return cmds
  }, [activeSessionId, sessions, onCreateSession, onCloseSession, toggleCommandPalette, toggleSettingsPanel, toggleSearchBar, toggleNotificationHistory, toggleStatsPanel, setActiveSession])

  const filtered = useMemo(() => {
    if (!query) return commands
    const lower = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(lower))
  }, [commands, query])

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!commandPaletteOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action()
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={toggleCommandPalette} />

      {/* Palette */}
      <div className="relative w-[500px] bg-[#16213e] border border-[#0f3460] rounded-lg shadow-2xl overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command..."
          className="w-full px-4 py-3 bg-transparent border-b border-[#0f3460] text-sm text-[#e0e0e0] placeholder-[#888888] focus:outline-none"
        />

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.map((cmd, idx) => (
            <div
              key={cmd.id}
              onClick={cmd.action}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`
                flex items-center justify-between px-4 py-2.5 cursor-pointer text-sm transition-colors
                ${idx === selectedIndex ? 'bg-[#0f3460] text-[#e0e0e0]' : 'text-[#888888] hover:text-[#e0e0e0]'}
              `}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="text-xs px-1.5 py-0.5 bg-[#1a1a2e] rounded text-[#888888]">{cmd.shortcut}</kbd>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-[#888888]">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuickCommandPalette
