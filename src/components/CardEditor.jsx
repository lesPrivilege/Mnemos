import { useState, useRef, useCallback } from 'react'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { S } from '../lib/strings'

function Preview({ text }) {
  const html = useRenderedMarkdown(text)
  if (!text.trim()) return null
  return (
    <div
      className="card-content text-sm leading-relaxed p-3 rounded-lg border border-border-soft bg-bg"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function Toolbar({ textareaRef, value, onChange }) {
  const insert = useCallback((before, after = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const sel = value.slice(start, end)
    const replacement = before + sel + after
    const next = value.slice(0, start) + replacement + value.slice(end)
    onChange(next)
    // restore cursor after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + before.length + sel.length
      ta.setSelectionRange(pos, pos)
    })
  }, [textareaRef, value, onChange])

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <button type="button" onClick={() => insert('**', '**')}
        className="px-2 py-1 rounded text-xs font-medium bg-bg-raised text-ink-2 hover:text-ink border border-border-soft">
        B
      </button>
      <button type="button" onClick={() => insert('*', '*')}
        className="px-2 py-1 rounded text-xs italic bg-bg-raised text-ink-2 hover:text-ink border border-border-soft">
        I
      </button>
      <button type="button" onClick={() => insert('`', '`')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft"
        style={{ fontFamily: 'var(--font-mono)' }}>
        {'</>'}
      </button>
      <button type="button" onClick={() => insert('$$\n', '\n$$')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft"
        style={{ fontFamily: 'var(--font-mono)' }}>
        $$ block
      </button>
      <button type="button" onClick={() => insert('$', '$')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft"
        style={{ fontFamily: 'var(--font-mono)' }}>
        $ inline
      </button>
      <button type="button" onClick={() => insert('> ')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft">
        &gt;
      </button>
      <button type="button" onClick={() => insert('- ')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft">
        -
      </button>
      <button type="button" onClick={() => insert(S.cardEditor.tableTemplate, ' |  |')}
        className="px-2 py-1 rounded text-xs bg-bg-raised text-ink-2 hover:text-ink border border-border-soft">
        table
      </button>
    </div>
  )
}

// Props: initial?, onSave(front, back), onCancel()
export default function CardEditor({ initial, onSave, onCancel }) {
  const [front, setFront] = useState(initial?.front || '')
  const [back, setBack] = useState(initial?.back || '')
  const [frontPreview, setFrontPreview] = useState(false)
  const [backPreview, setBackPreview] = useState(false)
  const frontRef = useRef(null)
  const backRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    if (onSave) onSave(front.trim(), back.trim())
    setFront('')
    setBack('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-ink-3 tracking-wider uppercase">Front</span>
        <button type="button" onClick={() => setFrontPreview(p => !p)}
          className="text-xs font-body text-ink-3 hover:text-ink tracking-wider uppercase">
          {frontPreview ? S.cardEditor.edit : S.cardEditor.preview}
        </button>
      </div>
      {frontPreview ? (
        <Preview text={front} />
      ) : (
        <>
          <Toolbar textareaRef={frontRef} value={front} onChange={setFront} />
          <textarea
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder={S.cardEditor.frontPlaceholder}
            rows={3}
            className="w-full p-3 rounded-lg border border-border bg-bg-card text-ink
              font-serif text-sm placeholder:text-ink-2/50
              focus:outline-none focus:border-accent resize-none"
          />
        </>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-body text-ink-3 tracking-wider uppercase">Back</span>
        <button type="button" onClick={() => setBackPreview(p => !p)}
          className="text-xs font-body text-ink-3 hover:text-ink tracking-wider uppercase">
          {backPreview ? S.cardEditor.edit : S.cardEditor.preview}
        </button>
      </div>
      {backPreview ? (
        <Preview text={back} />
      ) : (
        <>
          <Toolbar textareaRef={backRef} value={back} onChange={setBack} />
          <textarea
            ref={backRef}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder={S.cardEditor.backPlaceholder}
            rows={3}
            className="w-full p-3 rounded-lg border border-border bg-bg-card text-ink
              font-serif text-sm placeholder:text-ink-2/50
              focus:outline-none focus:border-accent resize-none"
          />
        </>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg font-medium text-sm font-body
            bg-accent text-white active:scale-[0.97] transition-transform
            disabled:opacity-40"
          disabled={!front.trim() || !back.trim()}
        >
          {initial ? S.cardEditor.save : S.cardEditor.add}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg font-medium text-sm font-body
              border border-border text-ink-2
              active:scale-[0.97] transition-transform"
          >
            {S.cardEditor.cancel}
          </button>
        )}
      </div>
    </form>
  )
}
