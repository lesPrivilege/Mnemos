import { useState, useCallback } from 'react'

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: opts.title || '确认操作',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || '确认',
        cancelLabel: opts.cancelLabel || '取消',
        destructive: opts.destructive ?? true,
        onResult: (result) => { setConfirmState(null); resolve(result) },
      })
    })
  }, [])

  return { confirmState, confirm }
}

export function ConfirmSheet({ state }) {
  if (!state) return null
  const { title, message, confirmLabel, cancelLabel, destructive, onResult } = state
  return (
    <>
      <div onClick={() => onResult(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 100,
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
        background: 'var(--bg-card, var(--bg))', borderTopLeftRadius: 16, borderTopRightRadius: 16,
        padding: '20px 18px max(20px, env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        animation: 'sheetUp 200ms ease-out',
      }}>
        <div style={{ fontFamily: 'var(--font-zh)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {title}
        </div>
        {message && (
          <div style={{ fontFamily: 'var(--font-zh)', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 16 }}>
            {message}
          </div>
        )}
        {!message && <div style={{ height: 12 }} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onResult(false)} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--font-zh)', fontSize: 14, fontWeight: 500,
          }}>{cancelLabel}</button>
          <button onClick={() => onResult(true)} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: destructive ? 'var(--danger, #ef4444)' : 'var(--accent)',
            color: '#fff', fontFamily: 'var(--font-zh)', fontSize: 14, fontWeight: 500,
          }}>{confirmLabel}</button>
        </div>
      </div>
      <style>{`@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  )
}
