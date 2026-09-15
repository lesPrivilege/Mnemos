import { useEffect, useRef, useState } from 'react'
import ContextDialog from './ContextDialog'
import { locateSource, focusSourceRange } from '../reading/lib/sourceAnchor'
import { renderDoc } from '../reading/lib/renderDoc'
import '../styles/markdown.css'

// Loader is explicit: the showroom never imports a production storage singleton.
export default function SourceLens({ source, open, onClose, loadDocument }) {
  const [state, setState] = useState({ status: 'loading' })
  const contentRef = useRef(null)
  useEffect(() => {
    if (!open || !source) return
    let active = true
    if (source.unresolved || source.kind !== 'document') { setState({ status: 'unavailable' }); return }
    setState({ status: 'loading' })
    Promise.resolve().then(() => loadDocument(source.id)).then(async document => {
      if (!document) { if (active) setState({ status: 'unavailable' }); return }
      const html = await renderDoc(document.content, document.format)
      const detached = window.document.createElement('div')
      detached.innerHTML = html
      const location = await locateSource(detached, source)
      if (active) setState({ ...location, html, title: document.title })
    }).catch(() => { if (active) setState({ status: 'error' }) })
    return () => { active = false }
  }, [open, source, loadDocument])
  useEffect(() => {
    if (state.status === 'exact' && contentRef.current) focusSourceRange(contentRef.current, state.offset, state.length)
  }, [state])
  if (!source) return null
  return <ContextDialog open={open} title="查看原文" onClose={onClose}>
    <div className="source-lens">
      <p className="source-quote">{source.quote}</p>
      {state.status === 'loading' && <p role="status">正在打开原文…</p>}
      {state.status === 'unavailable' && <p role="status">原材料已不存在，摘句仍保留。关闭可返回卡片。</p>}
      {state.status === 'error' && <p role="alert">原文未能载入。关闭后可以重试，卡片内容不受影响。</p>}
      {state.status === 'missing' && <p role="status">原文已变化，未找到这段摘句。下方保留当前原文供核对。</p>}
      {state.status === 'changed' && <div role="region" aria-label="候选位置"><p>原文已变化，请核对候选位置。</p>{state.candidates.map((candidate, index) => <button className="source-candidate" key={candidate.offset} onClick={() => focusSourceRange(contentRef.current, candidate.offset, candidate.length)}>候选位置 {index + 1}：{candidate.context}</button>)}</div>}
      {state.html && <><h3>{state.title}</h3><article ref={contentRef} className="card-content" dangerouslySetInnerHTML={{ __html: state.html }}/></>}
      <button className="btn btn-ghost" onClick={onClose}>返回卡片</button>
    </div>
  </ContextDialog>
}
