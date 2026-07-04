import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBackButton } from '../lib/useBackButton'
import { loadStarred, loadQuestions, toggleStar, deleteQuestion } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, StarIcon, TrashIcon } from '../components/Icons'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
import '../styles/markdown.css'

export default function Starred() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject')
  const [items, setItems] = useState([])

  useEffect(() => {
    const starredIds = loadStarred()
    const questions = loadQuestions()
    let filtered = questions.filter(q => starredIds.includes(q.id))
    if (subject) filtered = filtered.filter(q => q.subject === subject)
    setItems(filtered)
  }, [subject])

  const handleRemove = (id) => {
    toggleStar(id)
    setItems(prev => prev.filter(q => q.id !== id))
  }

  const handleDelete = async (id) => {
    const ok = await confirm({ title: S.starred.deleteQuestionTitle, message: S.starred.deleteQuestionMessage, confirmLabel: S.starred.confirmDelete })
    if (!ok) return
    deleteQuestion(id)
    setItems(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div className="page-fill">
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label={S.starred.back}><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{S.starred.title}</h1>
      </div>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3">
        {items.length === 0 ? (
          <div className="empty">
            <div className="glyph">★</div>
            <div className="msg">{S.starred.empty}</div>
            <div className="motto-zh">{S.starred.emptyHint}</div>
          </div>
        ) : (
           items.map(q => (
            <div key={q.id} className="bg-bg-card rounded-lg p-4 border cursor-pointer group" style={{ borderColor: 'var(--border-soft)' }}
              onClick={() => navigate(q.type === 'choice' ? `/quiz/${q.subject}?mode=starred&qid=${q.id}` : `/quiz-review/${q.subject}?mode=starred&qid=${q.id}`)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-xs text-ink-3 font-mono">{getSubjectDisplayName(q.subject)} · {q.chapter}</div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="hidden group-hover:inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(q.id) }}
                    title={S.starred.deleteQuestion}>
                    <TrashIcon size={14} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleRemove(q.id) }} style={{ color: 'var(--accent)' }}>
                    <StarIcon size={16} filled />
                  </button>
                </div>
              </div>
              <div className="text-sm text-ink card-content"><RenderMarkdown content={q.question || q.id} /></div>
            </div>
          ))
        )}
      </main>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
