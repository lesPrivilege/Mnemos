import { useState, useCallback, useRef, useEffect } from 'react'
import { S } from '../lib/strings'

export function useToast() {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const showToast = useCallback((msg, duration = 2500) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { toast, showToast }
}

export function Toast({ message, onClick }) {
  if (!message) return null
  return (
    <div className="toast" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {message}
      {onClick && <span style={{ opacity: 0.6, marginLeft: 6 }}>{S.common.undo}</span>}
    </div>
  )
}
