import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useBackButton } from '../lib/useBackButton'
import { loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { getCards, getDecks } from '../lib/storage'
import { getDocuments } from '../reading/lib/storage'
import { BackIcon, SearchIcon } from '../components/Icons'
import { S } from '../lib/strings'
import { buildQuizRoute } from '../quiz/lib/routes'

export default function Search() {
  const { goBack } = useBackButton()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const committed = params.get('q') || ''
  const kind = ['card', 'quiz', 'document'].includes(params.get('kind')) ? params.get('kind') : 'all'
  const [query, setQuery] = useState(committed)
  const [composing, setComposing] = useState(false)
  const inputRef = useRef(null)
  const [catalog] = useState(() => {
    const decks = new Map(getDecks().map(deck => [deck.id, deck.name]))
    return [
      ...[...decks.keys()].flatMap(id => getCards(id)).map(card => ({ id: `card:${card.id}`, kind: 'card', title: card.front || '未命名卡片', detail: decks.get(card.deckId) || '', text: `${card.front || ''} ${card.back || ''}`, route: `/browse/${encodeURIComponent(card.deckId)}?card=${encodeURIComponent(card.id)}` })),
      ...loadQuestions().map(q => ({ id: `quiz:${q.id}`, kind: 'quiz', title: q.question || q.id, detail: getSubjectDisplayName(q.subject), text: `${q.question || ''} ${q.id || ''}`, route: buildQuizRoute(q.type === 'choice' ? 'quiz' : 'quiz-review', q.subject, { chapter: q.chapter, qid: q.id }) })),
      ...getDocuments().map(doc => ({ id: `document:${doc.id}`, kind: 'document', title: doc.title || '未命名文档', detail: '按标题检索', text: doc.title || '', route: `/reading/doc/${encodeURIComponent(doc.id)}` })),
    ]
  })
  useEffect(() => { setQuery(committed) }, [committed])
  useEffect(() => {
    if (composing || query === committed) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (query) next.set('q', query); else next.delete('q')
      setParams(next, { replace: true, state: location.state })
    }, 300)
    return () => clearTimeout(timer)
  }, [query, committed, composing, params, setParams, location.state])
  const results = useMemo(() => {
    const q = committed.trim().toLowerCase()
    return q ? catalog.filter(item => (kind === 'all' || item.kind === kind) && item.text.toLowerCase().includes(q)) : []
  }, [catalog, committed, kind])
  const returnTo = `${location.pathname}${location.search}`
  const waiting = composing || query !== committed
  return <div className="page-fill">
    <div className="topbar">
      <button className="tb-btn" onClick={goBack} aria-label={S.search.back}><BackIcon/></button>
      <div className="search search-field"><SearchIcon size={16}/><input ref={inputRef} aria-label="搜索资料" value={query} onChange={e => setQuery(e.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={e => { setQuery(e.currentTarget.value); setComposing(false) }} placeholder="搜索题目、卡片或文档标题" autoFocus/></div>
    </div>
    <main className="search-results">
      <label>资料类型 <select aria-label="资料类型" value={kind} onChange={e => { const next = new URLSearchParams(params); next.set('kind', e.target.value); setParams(next, { replace: true, state: location.state }) }}><option value="all">全部</option><option value="card">卡片</option><option value="quiz">题目</option><option value="document">文档</option></select></label>
      <p role="status">{waiting ? '正在输入…' : committed.trim() ? `找到 ${results.length} 项` : '输入关键词查找资料。文档按标题检索。'}</p>
      {!waiting && <ul className="search-result-list">{results.map(item => <li key={item.id}><Link to={item.route} state={{ returnTo }}><span className="search-result-kind">{item.kind === 'card' ? '卡片' : item.kind === 'quiz' ? '题目' : '文档'} · {item.detail}</span><span>{item.title}</span></Link></li>)}</ul>}
    </main>
  </div>
}
