import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getQuizQuestions, markQuestion } from '../quiz/lib/quizEngine'
import { saveLastSession, loadLastSession, clearLastSession, toggleStar, isStarred, deleteQuestion, loadStarred, loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, CheckIcon, MoreIcon, TrashIcon } from '../components/Icons'
import { recordEvent } from '../lib/derive/events'
import { todayJourney } from '../lib/derive/today'
import { useBackButton } from '../lib/useBackButton'
import { buildQuizRoute } from '../quiz/lib/routes'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
import { pressable } from '../lib/a11y'
import { useOverlayFocus } from '../lib/useOverlayFocus'
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
  const chapter = searchParams.has('chapter') ? searchParams.get('chapter') : undefined
  const section = searchParams.has('section') ? searchParams.get('section') : undefined
  const chapterForSession = chapter === undefined ? null : chapter
  const sectionForSession = section === undefined ? null : section
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
  const menuTriggerRef = useRef(null)
  const menuRef = useRef(null)
  const touchStartX = useRef(null)
  const pendingQid = useRef(initialQid)
  const sessionRef = useRef(null)

  useOverlayFocus({
    open: showMenu,
    overlayRef: menuRef,
    triggerRef: menuTriggerRef,
    onEscape: () => setShowMenu(false),
  })

  const load = useCallback((m) => {
    const qid = pendingQid.current
    pendingQid.current = null
    const opts = { subject, chapter, section, type: 'review', mode: m }
    if (m === 'starred' || qid) opts.starredIds = loadStarred()
    if (!qid) opts.limit = 20

    // 中断恢复（同 QuizPage）：results 只重建 UI，不重放 markQuestion——
    // 重放会重复计分、错乱 streak。恢复落在「首个未答题」上。
    const saved = qid ? null : loadLastSession()
    if (
      saved && saved.mode === m && saved.subject === subject &&
      saved.chapter === chapterForSession && saved.section === sectionForSession &&
      Array.isArray(saved.questionIds) && saved.questionIds.length > 0
    ) {
      const byId = new Map(loadQuestions().map((q) => [q.id, q]))
      const restored = saved.questionIds.map((id) => byId.get(id)).filter(Boolean)
      if (restored.length > 0) {
        const validIds = new Set(restored.map((q) => q.id))
        const results = (Array.isArray(saved.results) ? saved.results : []).filter((r) => validIds.has(r.id))
        const answered = new Set(results.map((r) => r.id))
        let idx = Math.min(saved.currentIndex || 0, restored.length)
        while (idx < restored.length && answered.has(restored[idx].id)) idx++
        const stats = {
          wrong: results.filter((r) => !r.correct).length,
          correct: results.filter((r) => r.correct).length,
        }
        if (idx >= restored.length) {
          // 已全部作答（未点完成）——直接进完成屏
          setQuestions(restored)
          setResults(results)
          setStats(stats)
          setFinished(true)
          return
        }
        setQuestions(restored)
        setCurrentIndex(idx)
        setFlipped(false)
        setStats(stats)
        setResults(results)
        setFinished(false)
        return
      }
    }

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
      saveLastSession({
        subject, chapter: chapterForSession, section: sectionForSession, mode: m,
        route: buildQuizRoute('quiz-review', subject, { chapter, section }),
      })
    }
  }, [subject, chapter, section])

  useEffect(() => { load(mode) }, [subject, chapter, mode, load])

  // 完成即清——中断会话不复存在
  useEffect(() => {
    if (finished) clearLastSession()
  }, [finished])

  // 中断会话：真退出（未完成）时落盘一次。sessionRef 每帧持最新态。
  useEffect(() => {
    sessionRef.current = { finished, questions, results, mode, subject, chapter: chapterForSession, section: sectionForSession }
  })

  useEffect(() => {
    return () => {
      const s = sessionRef.current
      if (!s || s.finished || s.questions.length === 0) return
      // 已答数（仍在队列者）即首个未答题下标——翻面已评者视作已答。
      const qids = new Set(s.questions.map((q) => q.id))
      const answeredCount = s.results.reduce((n, r) => (qids.has(r.id) ? n + 1 : n), 0)
      if (answeredCount >= s.questions.length) {
        clearLastSession()
        return
      }
      saveLastSession({
        subject: s.subject, chapter: s.chapter, section: s.section, mode: s.mode,
        route: buildQuizRoute('quiz-review', s.subject, { chapter: s.chapter, section: s.section }),
        questionIds: s.questions.map((q) => q.id),
        currentIndex: answeredCount,
        results: s.results,
      })
    }
  }, [])

  const currentQuestion = questions[currentIndex]
  useEffect(() => {
    if (currentQuestion) setStarred(isStarred(currentQuestion.id))
  }, [currentQuestion?.id])

  const handleRate = (correct) => {
    if (!currentQuestion) return
    // 未见答不评（记-08）：与 Review 同构的内层卫
    if (!flipped) return
    const prog = markQuestion(currentQuestion.id, correct)
    setStats(prev => ({
      wrong: prev.wrong + (correct ? 0 : 1),
      correct: prev.correct + (correct ? 1 : 0),
    }))
    setResults(prev => [...prev, { id: currentQuestion.id, correct, wrongStreak: prog.wrongStreak }])
    recordEvent({ module: 'practice', correct, itemId: currentQuestion.id, subject })

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
    const ok = await confirm({ title: S.quiz.deleteQuestionTitle, message: S.quiz.deleteQuestionMessage, confirmLabel: S.quiz.confirmDelete, returnFocus: menuTriggerRef.current })
    if (!ok) return
    const idToDelete = currentQuestion.id
    deleteQuestion(idToDelete)
    const remaining = questions.filter(q => q.id !== idToDelete)
    setQuestions(remaining)
    if (remaining.length === 0) {
      setFinished(true)
      return
    }
    // 前进到首个未答题——不得落在 results 已记录的题上（已提交题不可重提）
    const answered = new Set(results.map((r) => r.id))
    let next = Math.min(currentIndex, remaining.length - 1)
    while (next < remaining.length && answered.has(remaining[next].id)) next++
    if (next >= remaining.length) {
      setFinished(true)
      return
    }
    setCurrentIndex(next)
    setFlipped(false)
  }

  // Done screen
  if (finished) {
    const total = results.length
    const correctRate = total > 0 ? Math.round(stats.correct / total * 100) : 0
    const newWrong = results.filter(r => !r.correct && r.wrongStreak === 1).length
    const nextStage = todayJourney().stages.find((stage) => stage.key !== 'practice' && stage.route)

    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizReview.back}><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={20} sw={2} /></div>
            <div className="done-title">{S.quiz.doneTitle}</div>
            <div className="done-sum">{S.quiz.doneSummary(total)}</div>
            <div className="rel">
              <div className="rel-row">
                <span className="k">{S.quizReview.masteredRateLabel}</span>
                <span className="v">{correctRate}%</span>
              </div>
              <div className="rel-row">
                <span className="k">{S.quiz.correctLabel}</span>
                <span className="v">{S.quiz.countUnit(stats.correct)}</span>
              </div>
              {stats.wrong > 0 && (
                <div className="rel-row">
                  <span className="k">{S.quiz.wrongLabel}</span>
                  <span className="v">{S.quiz.countUnit(stats.wrong)}</span>
                </div>
              )}
              {newWrong > 0 && (
                <div className="rel-row">
                  <span className="k">{S.quizReview.newWrongLabel}</span>
                  <span className="v">{S.quiz.countUnit(newWrong)}</span>
                </div>
              )}
            </div>
            <div className="done-actions">
              <button className="btn btn-ghost" onClick={() => goBack()}>{S.quiz.backAction}</button>
              {results.some(r => !r.correct)
                ? <button className="btn btn-primary" onClick={() => { setMode('wrong'); load('wrong') }}>{S.quiz.wrongReviewAction}</button>
                : nextStage
                  ? <Link to={nextStage.route} className="btn btn-primary">{S.quiz.continueToday(S.home.today.stageLabel[nextStage.key])}</Link>
                  : <button className="btn btn-primary" onClick={() => load(mode)}>{S.quiz.anotherRoundAction}</button>}
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
        <div className="px-[18px] pt-2 pb-1 flex gap-1.5 flex-wrap">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`chip ${mode === m.key ? 'on' : ''}`} aria-pressed={mode === m.key}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="page-scroll">
          <div className="empty">
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
      <div className="topbar" style={showMenu ? { zIndex: 50, pointerEvents: 'none' } : undefined}>
        <button className="tb-btn" inert={showMenu ? '' : undefined} onClick={() => goBack()} aria-label={S.quizReview.back}><BackIcon /></button>
        <div className="tb-actions">
          <button className="tb-btn" inert={showMenu ? '' : undefined} onClick={handleToggleStar}
            aria-label={starred ? S.quizReview.unstarQuestion : S.quizReview.starQuestion}
            style={{ color: starred ? 'var(--accent)' : 'var(--ink-3)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
          </button>
          <div className="relative">
            <button ref={menuTriggerRef} className="tb-btn" inert={showMenu ? '' : undefined} onClick={() => setShowMenu(o => !o)}
              aria-label={S.common.moreActions} aria-expanded={showMenu}>
              <MoreIcon size={18} />
            </button>
            {showMenu && (
              <div ref={menuRef} className="absolute right-0 top-9 z-20 min-w-[160px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                role="group" aria-label={S.common.moreActions}
                style={{ border: '1px solid var(--border-soft)', pointerEvents: 'auto' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  <li><button onClick={handleDeleteQuestion}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-danger hover:bg-bg-raised transition-colors">
                    <TrashIcon size={15} /> {S.quiz.deleteQuestion}
                  </button></li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {showMenu && (
        <button tabIndex="-1" className="menu-backdrop fixed inset-0 z-40 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.quizReview.closeMenu} />
      )}

      {/* Mode chips */}
      <div inert={showMenu ? '' : undefined} className="px-[18px] pt-2 pb-1 flex gap-1.5 flex-wrap">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`chip ${mode === m.key ? 'on' : ''}`} aria-pressed={mode === m.key}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div inert={showMenu ? '' : undefined} className="rv-progress">
        <div className="bar" style={{ transform: `scaleX(${questions.length ? currentIndex / questions.length : 0})` }} />
      </div>

      {/* Meta */}
      <div inert={showMenu ? '' : undefined} className="rv-meta">
        <span className="crumb">
          <span className="q-tag review">{S.quizReview.reviewTagLabel}</span>
          {currentQuestion.chapter}
        </span>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(questions.length).padStart(2, '0')}
        </span>
      </div>

      {/* Scrollable card area */}
      <div inert={showMenu ? '' : undefined} className="rv-card-wrap page-scroll">
        <div className="rv-card flip-card"
          aria-expanded={flipped}
          aria-disabled={flipped ? 'true' : undefined}
          onClick={() => !flipped && setFlipped(true)}
          {...pressable(() => !flipped && setFlipped(true))}
          style={{ flex: 1, minHeight: 0 }}>
          <div className={`flip-inner ${flipped ? 'flipped' : ''}`}>
            {/* FRONT */}
            <div className="flip-face">
              <span className="corner">
                <span>{S.quizReview.reviewTagLabel}</span>
              </span>
              <div className="body">
                <div className="front-q">
                  <RenderMarkdown content={frontContent} />
                </div>
              </div>
            </div>

            {/* BACK */}
            <div className="flip-face flip-back-face">
              <span className="corner">
                <span>{S.quizReview.referenceMark}</span>
              </span>
              <div className="body back">
                <div className="back-a">
                  <RenderMarkdown content={backContent} />
                </div>
              </div>
            </div>
          </div>
        </div>
        {!flipped && <div className="rv-flip-hint">{S.quizReview.flipHint}</div>}
      </div>

      {/* Rate buttons — only functional after flip, fixed height prevents card resize */}
      <div inert={showMenu ? '' : undefined} className="rate shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        <button className="rate-btn rate-again" disabled={!flipped}
          onClick={() => flipped && handleRate(false)}>
          <span>{S.quizReview.missedLabel}</span>
        </button>
        <button className="rate-btn rate-good" disabled={!flipped}
          onClick={() => flipped && handleRate(true)}>
          <span>{S.quizReview.gotItLabel}</span>
        </button>
      </div>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
