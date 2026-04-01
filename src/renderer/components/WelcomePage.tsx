import React from 'react'

interface WelcomePageProps {
  onCreateSession: () => void
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onCreateSession }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#1a1a2e] select-none">
      {/* Logo / Title */}
      <div className="mb-8 text-center">
        <div className="text-6xl mb-4">
          <span className="text-blue-400">C</span>
          <span className="text-emerald-400">N</span>
        </div>
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-2">Claude Notify</h1>
        <p className="text-[#888888] text-sm max-w-md">
          Monitor your Claude Code sessions with real-time status tracking and smart notifications.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onCreateSession}
          className="px-6 py-3 bg-[#0f3460] hover:bg-blue-700 text-[#e0e0e0] rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
        <p className="text-[#888888] text-xs">
          or press <kbd className="px-1.5 py-0.5 bg-[#16213e] rounded text-[#e0e0e0] text-xs">Ctrl+T</kbd>
        </p>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-12 text-xs text-[#888888] space-y-1 text-center">
        <p><kbd className="px-1 py-0.5 bg-[#16213e] rounded">Ctrl+T</kbd> New Session</p>
        <p><kbd className="px-1 py-0.5 bg-[#16213e] rounded">Ctrl+W</kbd> Close Session</p>
        <p><kbd className="px-1 py-0.5 bg-[#16213e] rounded">Ctrl+Tab</kbd> Switch Tab</p>
        <p><kbd className="px-1 py-0.5 bg-[#16213e] rounded">Ctrl+,</kbd> Settings</p>
      </div>
    </div>
  )
}

export default WelcomePage
