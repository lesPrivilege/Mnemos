import { useState, useCallback } from 'react'
import { S } from '../lib/strings'

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(null)

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setConfirmState({
        title: opts.title || S.common.confirmOperation,
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || S.common.confirm,
        cancelLabel: opts.cancelLabel || S.common.cancel,
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
      <div className="confirm-backdrop" onClick={() => onResult(false)} />
      <div className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="confirm-sheet-title">
        <div id="confirm-sheet-title" style={{ fontFamily: 'var(--font-zh)', fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
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
    </>
  )
}
