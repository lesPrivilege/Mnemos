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

export function Toast({ message, onClick }) {
  if (!message) return null
  return (
    <div onClick={onClick} style={{
      position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--bg)',
      padding: '8px 16px', borderRadius: 999, fontSize: 12,
      fontFamily: 'var(--font-zh)', cursor: onClick ? 'pointer' : 'default',
      boxShadow: 'var(--shadow-md)', zIndex: 50,
      animation: 'toastIn 150ms ease-out',
      maxWidth: '80vw', textAlign: 'center',
    }}>
      {message}
      {onClick && <span style={{ opacity: 0.6, marginLeft: 6 }}>撤销</span>}
      <style>{`@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  )
}
