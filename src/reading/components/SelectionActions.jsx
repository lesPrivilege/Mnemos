import { useLayoutEffect, useRef, useState } from 'react'

export default function SelectionActions({ selection, onExcerpt, onCreate, onClose }) {
  const ref = useRef(null)
  const [position, setPosition] = useState(null)
  useLayoutEffect(() => {
    if (!selection || !ref.current) return
    const toolbar = ref.current.getBoundingClientRect()
    const gap = parseFloat(getComputedStyle(ref.current).getPropertyValue('--sp-4')) || 0
    const rect = selection.rect
    const above = rect.top - toolbar.height - gap
    setPosition({ left: Math.max(gap, Math.min(rect.left, window.innerWidth - toolbar.width - gap)),
      top: Math.max(gap, Math.min(above >= gap ? above : rect.bottom + gap, window.innerHeight - toolbar.height - gap)) })
  }, [selection])
  if (!selection) return null
  return <div ref={ref} className="selection-actions" role="toolbar" aria-label="选区操作" onPointerDown={event => event.preventDefault()} style={position || { visibility: 'hidden' }} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
    <button onClick={onExcerpt}>摘录</button><button onClick={onCreate}>制成卡片</button><button onClick={onClose}>关闭</button>
  </div>
}
