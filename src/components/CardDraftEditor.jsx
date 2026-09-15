import { useRef, useState } from 'react'

// One editor for the product and its isolated showroom. Persistence is injected.
export default function CardDraftEditor({ initialDraft, decks, onSave, onSaved, onCancel, onPendingChange }) {
  const [draft, setDraft] = useState(initialDraft)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  async function submit(event) {
    event.preventDefault()
    if (lock.current || !draft.front.trim() || !draft.back.trim()) return
    lock.current = true; setPending(true); onPendingChange?.(true); setError('')
    try {
      const card = await onSave(draft)
      onSaved(card)
    } catch (failure) {
      setError(failure.message || '保存失败，输入已保留。请重试。')
      lock.current = false
    } finally { setPending(false); onPendingChange?.(false) }
  }
  const change = (field, value) => setDraft(previous => ({ ...previous, [field]: value }))
  return <form className="card-draft-editor" aria-label="卡片草稿" onSubmit={submit}>
    <label>问题<textarea autoFocus required value={draft.front} disabled={pending} onChange={event => change('front', event.target.value)}/></label>
    <label>答案<textarea required value={draft.back} disabled={pending} onChange={event => change('back', event.target.value)}/></label>
    <label>卡组<select value={draft.deckId || ''} disabled={pending} onChange={event => change('deckId', event.target.value)}>
      {decks.map(deck => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
      <option value="">新建卡组</option>
    </select></label>
    {!draft.deckId && <label>新卡组名称<input required value={draft.deckName || ''} disabled={pending} onChange={event => change('deckName', event.target.value)}/></label>}
    {error && <p role="alert">{error}</p>}
    <div className="card-draft-actions"><button className="btn btn-primary" type="submit" disabled={pending}>{pending ? '正在保存…' : error ? '重试保存' : '保存卡片'}</button><button className="btn btn-ghost" type="button" disabled={pending} onClick={onCancel}>取消草稿</button></div>
  </form>
}
