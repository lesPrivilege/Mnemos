import { useState, useCallback, useRef, useEffect } from 'react'

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

export function Toast({ message }) {
  if (!message) return null
  return (
    <div className="toast">
      {message}
    </div>
  )
}
