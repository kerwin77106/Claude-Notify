import React, { useState, useRef, useEffect } from 'react'
import { useUIStore } from '../stores/ui-store'
import { useSessionStore } from '../stores/session-store'
import { useTerminal } from '../hooks/useTerminal'

const SearchBar: React.FC = () => {
  const searchBarOpen = useUIStore((s) => s.searchBarOpen)
  const setSearchBarOpen = useUIStore((s) => s.setSearchBarOpen)
  const activeSessionId = useSessionStore((s) => s.activeSessionId)
  const { searchInTerminal, clearSearch } = useTerminal()

  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchBarOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!searchBarOpen) {
      setQuery('')
      if (activeSessionId) {
        clearSearch(activeSessionId)
      }
    }
  }, [searchBarOpen, activeSessionId, clearSearch])

  if (!searchBarOpen) return null

  const handleSearch = (findNext: boolean) => {
    if (activeSessionId && query) {
      searchInTerminal(activeSessionId, query, findNext)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch(!e.shiftKey)
    }
    if (e.key === 'Escape') {
      setSearchBarOpen(false)
    }
  }

  return (
    <div className="absolute top-0 right-4 z-40 flex items-center gap-2 bg-[#16213e] border border-[#0f3460] rounded-b-lg px-3 py-2 shadow-lg">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="w-60 px-2 py-1 bg-[#1a1a2e] border border-[#0f3460] rounded text-sm text-[#e0e0e0] placeholder-[#888888] focus:outline-none focus:border-blue-400"
      />
      <button
        onClick={() => handleSearch(false)}
        className="p-1 text-[#888888] hover:text-[#e0e0e0] transition-colors"
        title="Previous (Shift+Enter)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>
      <button
        onClick={() => handleSearch(true)}
        className="p-1 text-[#888888] hover:text-[#e0e0e0] transition-colors"
        title="Next (Enter)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <button
        onClick={() => setSearchBarOpen(false)}
        className="p-1 text-[#888888] hover:text-[#e0e0e0] transition-colors"
        title="Close (Esc)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default SearchBar
