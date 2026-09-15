import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusLater(element, preserveInside = null) {
  if (!element || typeof element.focus !== 'function') return () => {}
  const timer = setTimeout(() => {
    if (typeof document !== 'undefined' && !document.contains(element)) return
    if (preserveInside?.contains(document.activeElement) && document.activeElement !== preserveInside) return
    element.focus()
  }, 0)
  return () => clearTimeout(timer)
}

/**
 * Gives a small, non-menu overlay (operation group or dialog) a complete
 * focus contract: enter, Escape, return, and a local Tab loop.
 */
export function useOverlayFocus({ open, overlayRef, triggerRef, initialFocusRef, onEscape }) {
  const wasOpen = useRef(false)
  const escapeRef = useRef(onEscape)

  useEffect(() => {
    escapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false
        return focusLater(triggerRef?.current)
      }
      return undefined
    }

    wasOpen.current = true
    const overlay = overlayRef.current
    const initial = initialFocusRef?.current || overlay?.querySelector(FOCUSABLE) || overlay
    const cancelFocus = focusLater(initial, overlay)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        escapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const currentOverlay = overlayRef.current
      if (!currentOverlay) return
      const focusable = [...currentOverlay.querySelectorAll(FOCUSABLE)]
      if (focusable.length === 0) {
        event.preventDefault()
        currentOverlay.focus?.()
        return
      }

      const activeIndex = focusable.indexOf(document.activeElement)
      if (event.shiftKey) {
        if (activeIndex <= 0) {
          event.preventDefault()
          focusable[focusable.length - 1].focus()
        }
      } else if (activeIndex === focusable.length - 1 || activeIndex === -1) {
        event.preventDefault()
        focusable[0].focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelFocus()
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, overlayRef, triggerRef, initialFocusRef])
}
