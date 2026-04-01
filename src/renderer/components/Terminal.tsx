import React, { useRef, useEffect } from 'react'
import { useTerminal } from '../hooks/useTerminal'
import 'xterm/css/xterm.css'

interface TerminalProps {
  sessionId: string
  isActive: boolean
}

const TerminalComponent: React.FC<TerminalProps> = ({ sessionId, isActive }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { getOrCreateTerminal, fitTerminal, focusTerminal } = useTerminal()
  const initializedRef = useRef(false)

  // Initialize terminal on mount, then immediately fit to sync size with PTY
  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const instance = getOrCreateTerminal(sessionId, containerRef.current)
    if (instance) {
      // Fit immediately after open to sync xterm size → PTY resize
      requestAnimationFrame(() => {
        fitTerminal(sessionId)
        // Second fit after layout is fully settled
        setTimeout(() => fitTerminal(sessionId), 100)
      })
    }
  }, [sessionId, getOrCreateTerminal, fitTerminal])

  // Fit and focus when becoming active
  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => {
        fitTerminal(sessionId)
        focusTerminal(sessionId)
      })
    }
  }, [isActive, sessionId, fitTerminal, focusTerminal])

  // Handle container resize with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(() => {
      if (isActive) {
        fitTerminal(sessionId)
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [sessionId, isActive, fitTerminal])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 p-1"
      style={{
        display: isActive ? 'block' : 'none',
        visibility: isActive ? 'visible' : 'hidden',
      }}
    />
  )
}

export default TerminalComponent
