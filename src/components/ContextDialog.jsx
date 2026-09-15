import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayFocus } from '../lib/useOverlayFocus'
import { registerOverlayClose } from '../lib/overlayStack'

export default function ContextDialog({ open, title, onClose, children, dismissible = true }) {
  const overlayRef = useRef(null)
  const triggerRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = () => { if (dismissible) onClose() }
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const roots = [document.getElementById('root'), document.getElementById('design-root')].filter(Boolean)
    const previous = roots.map(root => root.inert)
    roots.forEach(root => { root.inert = true })
    const unregister = registerOverlayClose(() => closeRef.current())
    return () => { unregister(); roots.forEach((root, index) => { root.inert = previous[index] }) }
  }, [open])
  useOverlayFocus({ open, overlayRef, triggerRef, onEscape: () => closeRef.current() })
  return open ? createPortal(<div className="context-dialog-scrim">
    <section ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="context-dialog">
      <header><h2 id={titleId}>{title}</h2><button className="btn btn-ghost" disabled={!dismissible} onClick={onClose}>关闭</button></header>
      {children}
    </section>
  </div>, document.body) : null
}
