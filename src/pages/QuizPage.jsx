import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getQuizQuestions, submitAnswer } from '../quiz/lib/quizEngine'
import { saveLastSession, loadLastSession, clearLastSession, toggleStar, isStarred, deleteQuestion, loadStarred, loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, CheckIcon, XIcon, StarIcon, MoreIcon, TrashIcon } from '../components/Icons'
import { recordEvent } from '../lib/derive/events'
import { todayJourney } from '../lib/derive/today'
import { useBackButton } from '../lib/useBackButton'
import { buildQuizRoute } from '../quiz/lib/routes'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { hapticLight, hapticWarning, hapticSuccess } from '../lib/haptics'
import { S } from '../lib/strings'
import '../styles/markdown.css'

const MODES = [
  { key: 'random', label: S.quiz.modeRandom },
  { key: 'sequential', label: S.quiz.modeSequential },
  { key: 'new', label: S.quiz.modeNew },
  { key: 'wrong', label: S.quiz.modeWrong },
  { key: 'starred', label: S.quiz.modeStarred },
]

export default function Quiz() {
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

  const isMultiAnswer = (q) => (q?.answer || '').replace(/[^A-Za-z]/g, '').length > 1
  const answerLetterSet = (q) => new Set((q?.answer || '').replace(/[^A-Za-z]/g, '').toUpperCase().split(''))

  const [mode, setMode] = useState(initialMode && MODES.some(m => m.key === initialMode) ? initialMode : 'random')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null) // string (single) or Set (multi)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [results, setResults] = useState([])
  const [finished, setFinished] = useState(false)
  const [starred, setStarred] = useState(false)
  const [explainOpen, setExplainOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const pendingQid = useRef(initialQid)
  const sessionRef = useRef(null)

  const load = useCallback((m) => {
    const qid = pendingQid.current
    pendingQid.current = null // consume after first load
    const opts = { subject, chapter, section, type: 'choice', mode: m }
    if (m === 'starred' || qid) opts.starredIds = loadStarred()
    if (!qid) opts.limit = 10

    // 中断恢复（场景恢复推广·已调研）：同一题域同模式的未完会话按原队列续行。
    // results 只用来重建 UI 位置与完成屏统计，绝不可重放 submitAnswer——
    // 那会重复计分、错乱 streak。恢复落在「首个未答题」上。
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
        if (idx >= restored.length) {
          // 已全部答毕（未点完成）——直接进完成屏
          setQuestions(restored)
          setResults(results)
          setFinished(true)
          return
        }
        setQuestions(restored)
        setCurrentIndex(idx)
        setResults(results)
        setSelectedAnswer(null)
        setSubmitted(false)
        setResult(null)
        setFinished(false)
        setExplainOpen(false)
        return
      }
    }

    let loaded = getQuizQuestions(opts)
    // If qid specified, ensure it's at the front
    if (qid && loaded.length > 0) {
      const idx = loaded.findIndex(q => q.id === qid)
      if (idx > 0) {
        const [target] = loaded.splice(idx, 1)
        loaded.unshift(target)
      } else if (idx === -1) {
        // Not in result set — fetch by id and prepend
        const all = loadQuestions()
        const direct = all.find(q => q.id === qid)
        if (direct) loaded.unshift(direct)
      }
    }
    setQuestions(loaded)
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setSubmitted(false)
    setResult(null)
    setResults([])
    setFinished(false)
    setExplainOpen(false)
    if (loaded.length > 0) {
      saveLastSession({
        subject, chapter: chapterForSession, section: sectionForSession, mode: m,
        route: buildQuizRoute('quiz', subject, { chapter, section }),
      })
    }
  }, [subject, chapter, section])

  useEffect(() => { load(mode) }, [subject, chapter, mode, load])

  // 完成即清——中断会话不复存在；finished 由 sessionRef 携至卸载判别
  useEffect(() => {
    if (finished) clearLastSession()
  }, [finished])

  // 中断会话：真退出（未完成）时落盘一次。sessionRef 每帧持最新态，
  // 避免逐次答题都写 localStorage。
  useEffect(() => {
    sessionRef.current = { finished, questions, results, mode, subject, chapter: chapterForSession, section: sectionForSession }
  })

  useEffect(() => {
    return () => {
      const s = sessionRef.current
      if (!s || s.finished || s.questions.length === 0) return
      // 已答数（仍在队列者）即首个未答题下标——已提交未推进者视作已答。
      const qids = new Set(s.questions.map((q) => q.id))
      const answeredCount = s.results.reduce((n, r) => (qids.has(r.id) ? n + 1 : n), 0)
      if (answeredCount >= s.questions.length) {
        clearLastSession()
        return
      }
      saveLastSession({
        subject: s.subject, chapter: s.chapter, section: s.section, mode: s.mode,
        route: buildQuizRoute('quiz', s.subject, { chapter: s.chapter, section: s.section }),
        questionIds: s.questions.map((q) => q.id),
        currentIndex: answeredCount,
        results: s.results,
      })
    }
  }, [])

  // Haptic on quiz set complete
  useEffect(() => {
    if (finished) hapticSuccess()
  }, [finished])

  const currentQuestion = questions[currentIndex]
  useEffect(() => {
    if (currentQuestion) setStarred(isStarred(currentQuestion.id))
  }, [currentQuestion?.id])

  const handleSubmit = () => {
    if (!currentQuestion) return
    // 已提交题不可重提（记-38 未尽之对称防护）：恢复与连击路径都不得重放
    // submitAnswer——重复计分、streak 错乱。与 Review「未见答不评」同构。
    if (submitted || results.some((r) => r.id === currentQuestion.id)) return
    let answerStr
    if (isMultiAnswer(currentQuestion)) {
      if (!selectedAnswer || selectedAnswer.size === 0) return
      answerStr = [...selectedAnswer].sort().join('')
    } else {
      if (!selectedAnswer) return
      answerStr = selectedAnswer
    }
    const res = submitAnswer(currentQuestion.id, answerStr)
    setResult(res)
    setSubmitted(true)
    setExplainOpen(true)
    setResults(prev => [...prev, { id: currentQuestion.id, correct: res.correct, wrongStreak: res.wrongStreak }])
    recordEvent({ module: 'practice', correct: res.correct, itemId: currentQuestion.id, subject })
    hapticLight()
    if (res.correct === false) hapticWarning()
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
    // 前进到首个未答题——不得落在 results 已记录的题上（已提交题不可重提）
    const answered = new Set(results.map((r) => r.id))
    let next = Math.min(currentIndex, remaining.length - 1)
    while (next < remaining.length && answered.has(remaining[next].id)) next++
    if (next >= remaining.length) {
      setFinished(true)
      return
    }
    setCurrentIndex(next)
    setSelectedAnswer(null)
    setSubmitted(false)
    setResult(null)
    setExplainOpen(false)
  }

  // Done screen
  if (finished || (questions.length === 0 && results.length > 0)) {
    const correct = results.filter(r => r.correct === true).length
    const nextStage = todayJourney().stages.find((stage) => stage.key !== 'practice' && stage.route)
    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizPage.back}><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={20} sw={2} /></div>
            <div className="done-title">{S.quiz.doneTitle}</div>
            <div className="done-sum">{S.quiz.doneSummary(results.length)}</div>
            {/* 关系式（记-31）：孤立的「已练 N / 正确率 X%」不回答任何问题；
                「答对几题、错几题、错的往哪去」才是。 */}
            <div className="rel">
              <div className="rel-row">
                <span className="k">{S.quiz.correctRateLabel}</span>
                <span className="v">{results.length > 0 ? Math.round(correct / results.length * 100) : 0}%</span>
              </div>
              <div className="rel-row">
                <span className="k">{S.quiz.correctLabel}</span>
                <span className="v">{S.quiz.countUnit(correct)}</span>
              </div>
              {results.length - correct > 0 && (
                <div className="rel-row">
                  <span className="k">{S.quiz.wrongLabel}</span>
                  <span className="v">{S.quiz.countUnit(results.length - correct)}</span>
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
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizPage.back}><BackIcon /></button>
          <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)}{S.quizPage.subjectHeadingSuffix}</h1>
        </div>
        {/* 空态之下一步（病2）：提示所指的筛选器就在眼前 */}
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
            <div className="motto-zh">{S.quizPage.filterHint}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}>
      {/* Topbar */}
      <div className="topbar">
        <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizPage.back}><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)}</h1>
        <span className="font-mono text-xs">
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{currentIndex + 1}</span>
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
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.quizPage.closeMenu} />
                <div className="absolute right-0 top-9 z-20 min-w-[160px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={handleDeleteQuestion}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
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
            className={`chip ${mode === m.key ? 'on' : ''}`} aria-pressed={mode === m.key}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      <div className="rv-progress">
        <div className="bar" style={{ transform: `scaleX(${questions.length ? currentIndex / questions.length : 0})` }} />
      </div>

      {/* Meta */}
      <div className="rv-meta">
        <span className="crumb">
          <span className="q-tag choice">{S.quizPage.choiceLabel}{isMultiAnswer(currentQuestion) && S.quizPage.multiAnswerSuffix}</span>
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
            <span><span className="font-zh">{S.quizPage.choiceLabel}</span>{isMultiAnswer(currentQuestion) && <span style={{ marginLeft: 6, fontSize: 'var(--text-2xs)', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 'var(--r-md)' }}>{S.quizPage.multiAnswerBadge}</span>}</span>
          </span>
          <div className="qa-stem" style={{ maxHeight: '22dvh', overflowY: 'auto' }}>
            <RenderMarkdown content={currentQuestion.question} />
          </div>
          <div className="qa-options">
            {currentQuestion.options.map((opt, i) => {
              const letter = opt.charAt(0)
              const multi = isMultiAnswer(currentQuestion)
              const isSelected = multi
                ? (selectedAnswer instanceof Set && selectedAnswer.has(letter))
                : selectedAnswer === letter
              const correctSet = answerLetterSet(currentQuestion)
              const isCorrectMember = correctSet.has(letter)
              const isCorrect = submitted && isCorrectMember
              const isWrong = submitted && isSelected && !isCorrectMember
              let cls = 'qa-opt'
              if (submitted) {
                if (isCorrect) cls += ' correct'
                else if (isWrong) cls += ' wrong'
                else cls += ' faded'
              } else if (isSelected) cls += ' picked'

              return (
                <button key={i} className={cls} onClick={() => {
                  if (submitted) return
                  if (multi) {
                    setSelectedAnswer(prev => {
                      const next = prev instanceof Set ? new Set(prev) : new Set()
                      if (next.has(letter)) next.delete(letter)
                      else next.add(letter)
                      return next
                    })
                  } else {
                    setSelectedAnswer(letter)
                  }
                }} disabled={submitted}>
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
                <span className="qa-explain-h">{S.quizPage.explainHeading}</span>
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
              <div className="qa-explain-h">{S.quizPage.explainHeading}</div>
              <p>{result.correct ? S.quizPage.correctFeedback : S.quizPage.wrongFeedback}</p>
            </div>
          )}
        </div>
      </main>

      {/* Fixed bottom action */}
      <div className="p-[18px] pt-0 shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        {!submitted ? (
          <button onClick={handleSubmit}
            disabled={isMultiAnswer(currentQuestion) ? !(selectedAnswer instanceof Set && selectedAnswer.size > 0) : !selectedAnswer}
            className="btn btn-primary btn-block disabled:opacity-40">
            {S.quizPage.submit}
          </button>
        ) : (
          <button onClick={handleNext} className="btn btn-primary btn-block">
            {currentIndex < questions.length - 1 ? S.quizPage.nextQuestion : S.quizPage.finishLabel(results.filter(r => r.correct).length, results.length)}
          </button>
        )}
      </div>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
