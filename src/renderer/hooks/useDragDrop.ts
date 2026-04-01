import { useRef, useCallback } from 'react'

interface UseDragDropOptions {
  onReorder: (orderedIds: string[]) => void
}

export function useDragDrop({ onReorder }: UseDragDropOptions) {
  const dragItemRef = useRef<string | null>(null)
  const dragOverItemRef = useRef<string | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, sessionId: string) => {
    dragItemRef.current = sessionId
    e.dataTransfer.effectAllowed = 'move'
    // Make the dragged element semi-transparent
    const target = e.currentTarget as HTMLElement
    setTimeout(() => {
      target.style.opacity = '0.5'
    }, 0)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent, sessionId: string) => {
    e.preventDefault()
    dragOverItemRef.current = sessionId
    // Add visual indicator
    const target = e.currentTarget as HTMLElement
    target.style.borderTop = '2px solid #60a5fa'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.borderTop = ''
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, items: string[]) => {
      e.preventDefault()
      const target = e.currentTarget as HTMLElement
      target.style.borderTop = ''

      const dragId = dragItemRef.current
      const dropId = dragOverItemRef.current

      if (!dragId || !dropId || dragId === dropId) return

      const newOrder = [...items]
      const dragIdx = newOrder.indexOf(dragId)
      const dropIdx = newOrder.indexOf(dropId)

      if (dragIdx === -1 || dropIdx === -1) return

      // Remove dragged item and insert at drop position
      newOrder.splice(dragIdx, 1)
      newOrder.splice(dropIdx, 0, dragId)

      onReorder(newOrder)
    },
    [onReorder]
  )

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    dragItemRef.current = null
    dragOverItemRef.current = null
  }, [])

  return {
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  }
}
