import { useEffect } from 'react'

export interface ShortcutHandlers {
  onFocusSearch?: () => void
  onEscape?: () => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onToggleHelp?: () => void
  onToggleTv?: () => void
  onToggleFullscreen?: () => void
  onUndo?: () => void
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        handlers.onToggleHelp?.()
        return
      }
      if (isTypingTarget(e.target)) {
        if (e.key === 'Enter') handlers.onEnter?.()
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          handlers.onArrowDown?.()
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          handlers.onArrowUp?.()
        }
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        handlers.onFocusSearch?.()
        return
      }
      if (e.key.toLowerCase() === 't') {
        handlers.onToggleTv?.()
        return
      }
      if (e.key.toLowerCase() === 'f') {
        handlers.onToggleFullscreen?.()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        handlers.onUndo?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers, enabled])
}
