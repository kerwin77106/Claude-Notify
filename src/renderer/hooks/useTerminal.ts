import { useRef, useCallback, useEffect } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from 'xterm-addon-search'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { useSettingsStore } from '../stores/settings-store'

interface TerminalInstance {
  terminal: Terminal
  fitAddon: FitAddon
  searchAddon: SearchAddon
}

// Global map to persist terminal instances across re-renders
const terminalMap = new Map<string, TerminalInstance>()

// Track whether global IPC listeners are registered (only once)
let globalListenersRegistered = false
let globalListenersCleanup: (() => void) | null = null

function ensureGlobalListeners() {
  if (globalListenersRegistered) return
  globalListenersRegistered = true

  const unsubData = window.electronAPI.pty.onData((event) => {
    const instance = terminalMap.get(event.sessionId)
    if (instance) {
      instance.terminal.write(event.data)
    }
  })

  const unsubExit = window.electronAPI.pty.onExit((event) => {
    const instance = terminalMap.get(event.sessionId)
    if (instance) {
      instance.terminal.write(`\r\n\x1b[90m[Process exited with code ${event.exitCode}]\x1b[0m\r\n`)
    }
  })

  globalListenersCleanup = () => {
    unsubData()
    unsubExit()
    globalListenersRegistered = false
  }
}

export function useTerminal() {
  const cleanupListenersRef = useRef<(() => void)[]>([])
  const settings = useSettingsStore((s) => s.settings)

  // Create or retrieve a terminal instance for a session
  const getOrCreateTerminal = useCallback(
    (sessionId: string, container: HTMLElement): TerminalInstance => {
      const existing = terminalMap.get(sessionId)
      if (existing) {
        // Re-attach to new container if needed
        if (!container.querySelector('.xterm')) {
          existing.terminal.open(container)
          existing.fitAddon.fit()
        }
        return existing
      }

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: settings.fontSize,
        fontFamily: settings.fontFamily,
        theme: {
          background: '#1a1a2e',
          foreground: '#e0e0e0',
          cursor: '#e0e0e0',
          selectionBackground: 'rgba(15, 52, 96, 0.6)',
          black: '#1a1a2e',
          red: '#f87171',
          green: '#34d399',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#e0e0e0',
          brightBlack: '#6b7280',
          brightRed: '#fca5a5',
          brightGreen: '#6ee7b7',
          brightYellow: '#fde68a',
          brightBlue: '#93c5fd',
          brightMagenta: '#d8b4fe',
          brightCyan: '#67e8f9',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true,
      })

      const fitAddon = new FitAddon()
      const searchAddon = new SearchAddon()
      const webLinksAddon = new WebLinksAddon()

      terminal.loadAddon(fitAddon)
      terminal.loadAddon(searchAddon)
      terminal.loadAddon(webLinksAddon)

      terminal.open(container)
      fitAddon.fit()

      // Send terminal input to PTY
      const dataDisposable = terminal.onData((data) => {
        window.electronAPI.pty.write(sessionId, data)
      })

      // Handle resize
      const resizeDisposable = terminal.onResize(({ cols, rows }) => {
        window.electronAPI.pty.resize(sessionId, cols, rows)
      })

      const instance: TerminalInstance = { terminal, fitAddon, searchAddon }
      terminalMap.set(sessionId, instance)

      return instance
    },
    [settings.fontSize, settings.fontFamily]
  )

  // Fit terminal to container and force sync size to PTY
  const fitTerminal = useCallback((sessionId: string) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      try {
        instance.fitAddon.fit()
        // Force send resize even if xterm thinks size didn't change
        const { cols, rows } = instance.terminal
        window.electronAPI.pty.resize(sessionId, cols, rows)
      } catch {
        // ignore fit errors when container not visible
      }
    }
  }, [])

  // Search within terminal
  const searchInTerminal = useCallback((sessionId: string, query: string, findNext: boolean = true) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      if (findNext) {
        instance.searchAddon.findNext(query)
      } else {
        instance.searchAddon.findPrevious(query)
      }
    }
  }, [])

  // Clear search highlights
  const clearSearch = useCallback((sessionId: string) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      instance.searchAddon.clearDecorations()
    }
  }, [])

  // Write data to terminal (from PTY output)
  const writeToTerminal = useCallback((sessionId: string, data: string) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      instance.terminal.write(data)
    }
  }, [])

  // Destroy a terminal instance
  const destroyTerminal = useCallback((sessionId: string) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      instance.terminal.dispose()
      terminalMap.delete(sessionId)
    }
  }, [])

  // Focus a terminal
  const focusTerminal = useCallback((sessionId: string) => {
    const instance = terminalMap.get(sessionId)
    if (instance) {
      instance.terminal.focus()
    }
  }, [])

  // Ensure global IPC listeners are registered exactly once
  useEffect(() => {
    ensureGlobalListeners()
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      terminalMap.forEach((instance, sessionId) => {
        instance.fitAddon.fit()
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    getOrCreateTerminal,
    fitTerminal,
    searchInTerminal,
    clearSearch,
    writeToTerminal,
    destroyTerminal,
    focusTerminal,
    terminalMap,
  }
}
