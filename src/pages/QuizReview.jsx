import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getQuizQuestions, markQuestion } from '../quiz/lib/quizEngine'
import { saveLastSession, toggleStar, isStarred, deleteQuestion, loadStarred, loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, CheckIcon, MoreIcon, TrashIcon } from '../components/Icons'
import { addReviewEntry } from '../lib/reviewLog'
import { useBackButton } from '../lib/useBackButton'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
import '../styles/markdown.css'

const MODES = [
  { key: 'random', label: S.quiz.modeRandom },
  { key: 'sequential', label: S.quiz.modeSequential },
  { key: 'new', label: S.quiz.modeNew },
  { key: 'wrong', label: S.quiz.modeWrong },
  { key: 'starred', label: S.quiz.modeStarred },
]

export default function ReviewQuestion() {
  const { subject } = useParams()
  const [searchParams] = useSearchParams()
  const chapter = searchParams.get('chapter')
  const section = searchParams.get('section')
  const initialQid = searchParams.get('qid')
  const initialMode = searchParams.get('mode')
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()

  const [mode, setMode] = useState(initialMode && MODES.some(m => m.key === initialMode) ? initialMode : 'random')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState({ wrong: 0, correct: 0 })
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const [starred, setStarred] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const touchStartX = useRef(null)
  const pendingQid = useRef(initialQid)

  const load = useCallback((m) => {
    const qid = pendingQid.current
    pendingQid.current = null
    const opts = { subject, chapter, section, type: 'review', mode: m }
    if (m === 'starred' || qid) opts.starredIds = loadStarred()
    if (!qid) opts.limit = 20
    let loaded = getQuizQuestions(opts)
    if (qid && loaded.length > 0) {
      const idx = loaded.findIndex(q => q.id === qid)
      if (idx > 0) {
        const [target] = loaded.splice(idx, 1)
        loaded.unshift(target)
      } else if (idx === -1) {
        const all = loadQuestions()
        const direct = all.find(q => q.id === qid)
        if (direct) loaded.unshift(direct)
      }
    }
    setQuestions(loaded)
    setCurrentIndex(0)
    setFlipped(false)
    setStats({ wrong: 0, correct: 0 })
    setResults([])
    setFinished(false)
    if (loaded.length > 0) {
      saveLastSession({ subject, chapter, route: `/quiz-review/${subject}${chapter ? `?chapter=${encodeURIComponent(chapter)}` : ''}` })
    }
  }, [subject, chapter, section])

  useEffect(() => { load(mode) }, [subject, chapter, mode, load])

  const currentQuestion = questions[currentIndex]
  useEffect(() => {
    if (currentQuestion) setStarred(isStarred(currentQuestion.id))
  }, [currentQuestion?.id])

  const handleRate = (correct) => {
    if (!currentQuestion) return
    const prog = markQuestion(currentQuestion.id, correct)
    setStats(prev => ({
      wrong: prev.wrong + (correct ? 0 : 1),
      correct: prev.correct + (correct ? 1 : 0),
    }))
    setResults(prev => [...prev, { id: currentQuestion.id, correct, wrongStreak: prog.wrongStreak }])
    addReviewEntry({ type: 'quiz', correct, itemId: currentQuestion.id, subject })

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
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
    const ok = await confirm({ title: S.quiz.deleteQuestionTitle, message: S.quiz.deleteQuestionMessage, confirmLabel: S.quiz.confirmDelete })
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
    setFlipped(false)
  }

  // Done screen
  if (finished) {
    const total = results.length
    const correctRate = total > 0 ? Math.round(stats.correct / total * 100) : 0
    const newWrong = results.filter(r => !r.correct && r.wrongStreak === 1).length

    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizReview.back}><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={32} /></div>
            <div className="done-title">{S.quiz.doneTitle}</div>
            <div className="done-stats">
              <span>{S.quizReview.practicedLabel} <span className="v">{total}</span></span>
              <span>{S.quizReview.masteredRateLabel} <span className="v">{correctRate}%</span></span>
            </div>
            {newWrong > 0 && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--danger)' }}>
                {S.quizReview.newWrongPrefix}{newWrong}
              </div>
            )}
            <div className="done-grid two">
              <div className="cell good"><span className="num">{stats.correct}</span><span>{S.quiz.correctLabel}</span></div>
              <div className="cell again"><span className="num">{stats.wrong}</span><span>{S.quiz.wrongLabel}</span></div>
            </div>
            <div style={{ display: 'flex', gap: 8, width: '100%', marginTop: 8 }}>
              <button className="btn btn-ghost btn-block" onClick={() => goBack()}>{S.quiz.backAction}</button>
              {results.some(r => !r.correct) && (
                <button className="btn btn-accent btn-block" onClick={() => { setMode('wrong'); load('wrong') }}>{S.quiz.wrongReviewAction}</button>
              )}
              <button className="btn btn-primary btn-block" onClick={() => load(mode)}>{S.quiz.anotherRoundAction}</button>
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
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizReview.back}><BackIcon /></button>
          <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)}</h1>
        </div>
        <div className="page-scroll">
          <div className="empty">
            <div className="glyph">?</div>
            <div className="msg">{S.quiz.noQuestions}</div>
            <div className="motto-zh">{S.quizReview.noMatchingQuestions}</div>
          </div>
        </div>
      </div>
    )
  }

  const frontContent = currentQuestion.question || currentQuestion.id

  let backContent = currentQuestion.answer || currentQuestion.explanation || S.quizReview.noExplanation
  if (currentQuestion.solution_path) {
    backContent = `${S.quizReview.referencePathPrefix}\n\`\`\`\n${currentQuestion.solution_path}\n\`\`\`\n\n${backContent}`
  }

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 80) {
      if (!flipped) {
        setFlipped(true)
      } else {
        if (dx > 0) handleRate(true)
        else handleRate(false)
      }
    }
    touchStartX.current = null
  }

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {/* Topbar */}
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizReview.back}><BackIcon /></button>
        <span className="font-mono text-[11px]">
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{String(currentIndex + 1).padStart(2, '0')}</span>
          <span style={{ color: 'var(--ink-3)' }}> / {String(questions.length).padStart(2, '0')}</span>
        </span>
        <div className="tb-actions">
          <button className="tb-btn" onClick={handleToggleStar} style={{ color: starred ? 'var(--accent)' : 'var(--ink-3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
          </button>
          <div className="relative">
            <button className="tb-btn" onClick={() => setShowMenu(o => !o)}
              aria-haspopup="menu" aria-expanded={showMenu}>
              <MoreIcon size={18} />
            </button>
            {showMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.quizReview.closeMenu} />
                <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-md bg-bg-card shadow-lg overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={handleDeleteQuestion}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> {S.quiz.deleteQuestion}
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
          <span className="q-tag review">{S.quizReview.reviewTagLabel}</span>
          {currentQuestion.chapter}
        </span>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(questions.length).padStart(2, '0')}
        </span>
      </div>

      {/* Scrollable card area */}
      <div className="rv-card-wrap page-scroll">
        <div className="rv-card flip-card" onClick={() => !flipped && setFlipped(true)}
          style={{ flex: 1, minHeight: 0 }}>
          <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
            {/* FRONT */}
            <div className="flip-face">
              <span className="corner">
                <span className="num">{String(currentIndex + 1).padStart(2, '0')}</span>
                <span>{S.quizReview.reviewTagLabel} · {S.quizReview.essayKeyLabel}</span>
              </span>
              <div className="body">
                <div className="front-q">
                  <RenderMarkdown content={frontContent} />
                </div>
              </div>
              <div className="ornament" />
            </div>

            {/* BACK */}
            <div className="flip-face flip-back-face">
              <span className="corner">
                <span className="num">{String(currentIndex + 1).padStart(2, '0')}</span>
                <span>{S.quizReview.referenceKeyLabel}</span>
              </span>
              <div className="body back">
                <div className="back-a">
                  <RenderMarkdown content={backContent} />
                </div>
              </div>
              <div className="ornament" />
            </div>
          </div>
        </div>
        {!flipped && <div className="rv-flip-hint">{S.quizReview.flipHint}</div>}
      </div>

      {/* Rate buttons — only functional after flip, fixed height prevents card resize */}
      <div className="rate shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        <button className="rate-btn rate-again"
          onClick={() => flipped && handleRate(false)}
          style={{ visibility: flipped ? 'visible' : 'hidden', cursor: flipped ? 'pointer' : 'default' }}>
          <span>{S.quizReview.missedLabel}</span><span className="iv">MISSED</span>
        </button>
        <button className="rate-btn rate-easy"
          onClick={() => flipped && handleRate(true)}
          style={{ visibility: flipped ? 'visible' : 'hidden', cursor: flipped ? 'pointer' : 'default' }}>
          <span>{S.quizReview.gotItLabel}</span><span className="iv">GOT IT</span>
        </button>
      </div>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
