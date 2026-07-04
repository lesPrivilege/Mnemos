import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBackButton } from '../lib/useBackButton'
import { getWrongQuestions } from '../quiz/lib/quizEngine'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { getSubjectList, deleteQuestion } from '../quiz/lib/storage'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, TrashIcon } from '../components/Icons'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
import '../styles/markdown.css'

function questionsToCards(questions) {
  return questions.map(q => {
    let front, back
    if (q.type === 'choice') {
      front = q.question || q.id
      if (q.options?.length) front += '\n\n' + q.options.join('\n')
      back = `${S.wrong.correctAnswerPrefix}${q.answer || ''}`
      if (q.explanation) back += '\n\n' + q.explanation
    } else {
      front = q.question || q.id
      back = q.answer || q.explanation || ''
    }
    return { front, back, type: 'recall', chapter: q.chapter || '', section: q.section || '' }
  })
}

export default function Wrong() {
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const [searchParams] = useSearchParams()
  const subject = searchParams.get('subject')
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [selectedSubject, setSelectedSubject] = useState(subject)
  const [subjects, setSubjects] = useState([])

  const refresh = () => {
    setSubjects(getSubjectList())
    setWrongQuestions(getWrongQuestions(selectedSubject, 50))
  }

  useEffect(() => { refresh() }, [selectedSubject])
  useEffect(() => { setSelectedSubject(subject) }, [subject])

  const handleDelete = async (id) => {
    const ok = await confirm({ title: S.wrong.deleteQuestionTitle, message: S.wrong.deleteQuestionMessage, confirmLabel: S.wrong.confirmDelete })
    if (!ok) return
    deleteQuestion(id)
    refresh()
  }

  return (
    <div className="page-fill">
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label="Back"><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{S.wrong.title}</h1>
        {wrongQuestions.length > 0 && (
          <button className="tb-btn font-zh text-[13px]"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              const cards = questionsToCards(wrongQuestions)
              const name = selectedSubject
                ? `${S.wrong.subjectDeckNamePrefix}${getSubjectDisplayName(selectedSubject)}`
                : S.wrong.defaultDeckName
              navigate('/import', { state: { prefillCards: cards, prefillDeckName: name } })
            }}>
            {S.wrong.generateFlashcards}
          </button>
        )}
      </div>

      <div className="scr" style={{ paddingBottom: 0, gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          <button onClick={() => setSelectedSubject(null)}
            className={`chip ${!selectedSubject ? 'on' : ''}`}>{S.wrong.all}</button>
          {subjects.map(s => (
            <button key={s} onClick={() => setSelectedSubject(s)}
              className={`chip ${selectedSubject === s ? 'on' : ''}`}>{getSubjectDisplayName(s)}</button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-[18px] flex flex-col gap-3">
        {wrongQuestions.length === 0 ? (
          <div className="empty">
            <div className="glyph">✓</div>
            <div className="msg">{S.wrong.empty}</div>
            <div className="motto-zh">{S.wrong.emptyHint}</div>
          </div>
        ) : (
          wrongQuestions.map(q => (
            <div key={q.id} className="bg-bg-card rounded-lg p-4 border group" style={{ borderColor: 'var(--border-soft)' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-xs text-ink-3 font-mono">{getSubjectDisplayName(q.subject)} · {q.chapter}</div>
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{q.type}</span>
              </div>
              <div className="text-sm text-ink mb-2 card-content"><RenderMarkdown content={q.question || q.id} /></div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-ink-3">
                  <span>{S.wrong.wrongCountSuffix(q.wrong_count)}</span>
                  <span>{S.wrong.wrongStreakSuffix(q.wrongStreak)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    className="hidden group-hover:inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 hover:text-danger hover:bg-danger-soft transition-colors"
                    onClick={() => handleDelete(q.id)}
                    title={S.wrong.deleteQuestion}>
                    <TrashIcon size={14} />
                  </button>
                  <button onClick={() => navigate(q.type === 'choice' ? `/quiz/${q.subject}?mode=wrong&qid=${q.id}` : `/quiz-review/${q.subject}?mode=wrong&qid=${q.id}`)}
                    className="px-3 py-1 rounded text-xs font-medium" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{S.wrong.redo}</button>
                </div>
              </div>
            </div>
          ))
        )}
      </main>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
