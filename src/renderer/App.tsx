import React, { useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import TerminalComponent from './components/Terminal'
import StatusBar from './components/StatusBar'
import WelcomePage from './components/WelcomePage'
import SearchBar from './components/SearchBar'
import SettingsPanel from './components/SettingsPanel'
import GitPanel from './components/GitPanel'
import SplitView from './components/SplitView'
import QuickCommandPalette from './components/QuickCommandPalette'
import NotificationHistory from './components/NotificationHistory'
import StatsPanel from './components/StatsPanel'
import { useSession } from './hooks/useSession'
import { useNotification } from './hooks/useNotification'
import { useKeyboard } from './hooks/useKeyboard'
import { useSettingsStore } from './stores/settings-store'
import { useUIStore } from './stores/ui-store'

const App: React.FC = () => {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    closeSession,
    renameSession,
    reorderSessions,
    loadSessions,
  } = useSession()

  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const showGitPanel = useSettingsStore((s) => s.settings.showGitPanel)
  const splitViewEnabled = useUIStore((s) => s.splitViewEnabled)

  // Initialize notification listener
  useNotification()

  // Initialize keyboard shortcuts
  const handleCreateSession = useCallback(() => {
    createSession()
  }, [createSession])

  const handleCloseSession = useCallback(
    (sessionId: string) => {
      closeSession(sessionId)
    },
    [closeSession]
  )

  useKeyboard({
    onCreateSession: handleCreateSession,
    onCloseSession: handleCloseSession,
  })

  // Load settings and sessions on mount
  useEffect(() => {
    loadSettings()
    loadSessions()
  }, [loadSettings, loadSessions])

  // Update window title based on active session
  useEffect(() => {
    const activeSession = sessions.find((s) => s.id === activeSessionId)
    if (activeSession) {
      window.electronAPI.window.setTitle(`Claude Notify - ${activeSession.name}`)
    } else {
      window.electronAPI.window.setTitle('Claude Notify')
    }
  }, [activeSessionId, sessions])

  const hasSessions = sessions.length > 0

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1a1a2e]">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSession}
          onCreateSession={handleCreateSession}
          onRenameSession={renameSession}
          onReorderSessions={reorderSessions}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {hasSessions ? (
            <>
              {/* Tab bar */}
              <TabBar
                sessions={sessions}
                activeSessionId={activeSessionId}
                onSelectTab={setActiveSession}
                onCloseTab={handleCloseSession}
              />

              {/* Terminal area */}
              <div className="flex-1 relative min-h-0">
                {/* Search bar (floating) */}
                <SearchBar />

                {splitViewEnabled ? (
                  <SplitView />
                ) : (
                  // Render all terminals but only show active one (no unmount)
                  sessions.map((session) => (
                    <TerminalComponent
                      key={session.id}
                      sessionId={session.id}
                      isActive={session.id === activeSessionId}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <WelcomePage onCreateSession={handleCreateSession} />
          )}
        </div>

        {/* Git panel (optional) */}
        {showGitPanel && hasSessions && <GitPanel />}
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Overlay panels */}
      <SettingsPanel />
      <NotificationHistory />
      <StatsPanel />
      <QuickCommandPalette
        onCreateSession={handleCreateSession}
        onCloseSession={handleCloseSession}
      />
    </div>
  )
}

export default App
