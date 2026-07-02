import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getQuizQuestions, submitAnswer } from '../quiz/lib/quizEngine'
import { saveLastSession, toggleStar, isStarred, deleteQuestion } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, CheckIcon, XIcon, StarIcon, MoreIcon, TrashIcon } from '../components/Icons'
import { addReviewEntry } from '../lib/reviewLog'
import { useBackButton } from '../lib/useBackButton'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import '../styles/markdown.css'

const MODES = [
  { key: 'random', label: '随机' },
  { key: 'sequential', label: '顺序' },
  { key: 'new', label: '未做' },
  { key: 'wrong', label: '错题' },
]

export default function Quiz() {
  const { subject } = useParams()
  const [searchParams] = useSearchParams()
  const chapter = searchParams.get('chapter')
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()

  const [mode, setMode] = useState('random')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const [starred, setStarred] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const load = useCallback((m) => {
    const loaded = getQuizQuestions({ subject, chapter, type: 'choice', mode: m, limit: 10 })
    setQuestions(loaded)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setSubmitted(false)
    setResult(null)
    setResults([])
    setFinished(false)
    setExplainOpen(false)
    if (loaded.length > 0) {
      saveLastSession({ subject, chapter, route: `/quiz/${subject}${chapter ? `?chapter=${encodeURIComponent(chapter)}` : ''}` })
    }
  }, [subject, chapter])

  useEffect(() => { load(mode) }, [subject, chapter, mode, load])

  const currentQuestion = questions[currentIndex]
  useEffect(() => {
    if (currentQuestion) setStarred(isStarred(currentQuestion.id))
  }, [currentQuestion?.id])

  const handleSubmit = () => {
    if (!selectedAnswer || !currentQuestion) return
    const res = submitAnswer(currentQuestion.id, selectedAnswer)
    setResult(res)
    setSubmitted(true)
    setExplainOpen(true)
    setResults(prev => [...prev, { id: currentQuestion.id, correct: res.correct, wrongStreak: res.wrongStreak }])
    addReviewEntry({ type: 'quiz', correct: res.correct, itemId: currentQuestion.id, subject })
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setSubmitted(false)
      setResult(null)
      setExplainOpen(false)
    } else {
      setFinished(true)
    }
  }

  const handleToggleStar = () => {
    if (!currentQuestion) return
    setStarred(toggleStar(currentQuestion.id))
  }

  const handleDeleteQuestion = async () => {
    if (!currentQuestion) return
    setShowMenu(false)
    const ok = await confirm({ title: '删除题目', message: '删除这道题目？此操作不可撤销。', confirmLabel: '确认删除' })
    if (!ok) return
    const idToDelete = currentQuestion.id
    deleteQuestion(idToDelete)
    const remaining = questions.filter(q => q.id !== idToDelete)
    setQuestions(remaining)
    if (remaining.length === 0) {
      setFinished(true)
      return
    }
    if (currentIndex >= remaining.length) setCurrentIndex(remaining.length - 1)
    setSelectedAnswer(null)
    setSubmitted(false)
    setResult(null)
    setExplainOpen(false)
  }

  // Done screen
  if (finished || (questions.length === 0 && results.length > 0)) {
    const correct = results.filter(r => r.correct === true).length
    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button className="tb-btn" onClick={() => goBack()} aria-label="Back"><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={32} /></div>
            <div className="done-title">一组练毕</div>
            <div className="done-stats">
              <span>已练 <span className="v">{results.length}</span></span>
              <span>正确率 <span className="v">{results.length > 0 ? Math.round(correct / results.length * 100) : 0}%</span></span>
            </div>
            <div className="done-grid two">
              <div className="cell good"><span className="num">{correct}</span><span>正确</span></div>
              <div className="cell again"><span className="num">{results.length - correct}</span><span>错误</span></div>
            </div>
            <div className="flex gap-2 w-full mt-2">
              <button className="btn btn-ghost btn-block" onClick={() => goBack()}>返回</button>
              {results.some(r => !r.correct) && (
                <button className="btn btn-accent btn-block" onClick={() => { setMode('wrong'); load('wrong') }}>错题回顾</button>
              )}
              <button className="btn btn-primary btn-block" onClick={() => load(mode)}>再来一组</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No questions
  if (questions.length === 0) {
    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button className="tb-btn" onClick={() => goBack()} aria-label="Back"><BackIcon /></button>
          <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)} · 选择题</h1>
        </div>
        <div className="page-scroll">
          <div className="empty">
            <div className="glyph">?</div>
            <div className="msg">暂无题目</div>
            <div className="motto-zh">请更换筛选条件</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}>
      {/* Topbar */}
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label="Back"><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)}</h1>
        <span className="font-mono text-[11px]">
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{currentIndex + 1}</span>
          <span style={{ color: 'var(--ink-3)' }}> / {questions.length}</span>
        </span>
        <div className="tb-actions">
          <button className="tb-btn" onClick={handleToggleStar}
            style={{ color: starred ? 'var(--accent)' : 'var(--ink-3)' }}>
            <StarIcon size={18} filled={starred} />
          </button>
          <div className="relative">
            <button className="tb-btn" onClick={() => setShowMenu(o => !o)}
              aria-haspopup="menu" aria-expanded={showMenu}>
              <MoreIcon size={18} />
            </button>
            {showMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-md bg-bg-card shadow-lg overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={handleDeleteQuestion}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> 删除题目
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode chips */}
      <div className="px-[18px] pt-2 pb-1 flex gap-1.5 flex-wrap">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`chip ${mode === m.key ? 'on' : ''}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="rv-progress">
        <div className="bar" style={{ width: `${(currentIndex / questions.length) * 100}%` }} />
      </div>

      {/* Meta */}
      <div className="rv-meta">
        <span className="crumb">
          <span className="q-tag choice">选择</span>
          {currentQuestion.chapter}
        </span>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(questions.length).padStart(2, '0')}
        </span>
      </div>

      {/* Scrollable content */}
      <main className="page-scroll p-[18px] flex flex-col gap-3">
        {/* Question card */}
        <div className="qa-card">
          <span className="corner">
            <span className="num">{String(currentIndex + 1).padStart(2, '0')}</span>
            <span>选择 · CHOICE</span>
          </span>
          <div className="qa-stem" style={{ maxHeight: '22dvh', overflowY: 'auto' }}>
            <RenderMarkdown content={currentQuestion.question} />
          </div>
          <div className="qa-options">
            {currentQuestion.options.map((opt, i) => {
              const letter = opt.charAt(0)
              const isSelected = selectedAnswer === letter
              const isCorrect = submitted && letter === currentQuestion.answer
              const isWrong = submitted && isSelected && letter !== currentQuestion.answer
              let cls = 'qa-opt'
              if (submitted) {
                if (isCorrect) cls += ' correct'
                else if (isWrong) cls += ' wrong'
                else cls += ' faded'
              } else if (isSelected) cls += ' picked'

              return (
                <button key={i} className={cls} onClick={() => !submitted && setSelectedAnswer(letter)} disabled={submitted}>
                  <span className="qa-mark">{String.fromCharCode(65 + i)}</span>
                  <span className="qa-text line-clamp-3"><RenderMarkdown content={opt} /></span>
                  {submitted && isCorrect && <span className="qa-icon"><CheckIcon size={16} /></span>}
                  {submitted && isWrong && <span className="qa-icon"><XIcon size={16} /></span>}
                </button>
              )
            })}
          </div>
          {submitted && result && result.explanation && (
            <div className="qa-explain">
              <button className="qa-explain-toggle" onClick={() => setExplainOpen(v => !v)}>
                <span className="qa-explain-h">解析 · WHY</span>
                <span className={`qa-explain-caret ${explainOpen ? 'open' : ''}`}>›</span>
              </button>
              {explainOpen && (
                <div className="qa-explain-body">
                  <p><RenderMarkdown content={result.explanation} /></p>
                </div>
              )}
            </div>
          )}
          {submitted && result && !result.explanation && (
            <div className="qa-explain">
              <div className="qa-explain-h">解析 · WHY</div>
              <p>{result.correct ? '回答正确。' : '回答错误。'}</p>
            </div>
          )}
          <div className="ornament" />
        </div>
      </main>

      {/* Fixed bottom action */}
      <div className="p-[18px] pt-0 shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        {!submitted ? (
          <button onClick={handleSubmit} disabled={!selectedAnswer}
            className="btn btn-primary btn-block disabled:opacity-40">
            提交
          </button>
        ) : (
          <button onClick={handleNext} className="btn btn-primary btn-block">
            {currentIndex < questions.length - 1 ? '下一题' : `完成 (${results.filter(r => r.correct).length}/${results.length})`}
          </button>
        )}
      </div>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
