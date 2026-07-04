import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { getQuizQuestions, submitAnswer } from '../quiz/lib/quizEngine'
import { saveLastSession, toggleStar, isStarred, deleteQuestion, loadStarred, loadQuestions } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import RenderMarkdown from '../quiz/components/RenderMarkdown'
import { BackIcon, CheckIcon, XIcon, StarIcon, MoreIcon, TrashIcon } from '../components/Icons'
import { addReviewEntry } from '../lib/reviewLog'
import { useBackButton } from '../lib/useBackButton'
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
  const chapter = searchParams.get('chapter')
  const section = searchParams.get('section')
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

  const load = useCallback((m) => {
    const qid = pendingQid.current
    pendingQid.current = null // consume after first load
    const opts = { subject, chapter, section, type: 'choice', mode: m }
    if (m === 'starred' || qid) opts.starredIds = loadStarred()
    if (!qid) opts.limit = 10
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
      saveLastSession({ subject, chapter, route: `/quiz/${subject}${chapter ? `?chapter=${encodeURIComponent(chapter)}` : ''}` })
    }
  }, [subject, chapter, section])

  useEffect(() => { load(mode) }, [subject, chapter, mode, load])

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
    addReviewEntry({ type: 'quiz', correct: res.correct, itemId: currentQuestion.id, subject })
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
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizPage.back}><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={32} /></div>
            <div className="done-title">{S.quiz.doneTitle}</div>
            <div className="done-stats">
              <span>{S.quiz.practicedLabel} <span className="v">{results.length}</span></span>
              <span>{S.quiz.correctRateLabel} <span className="v">{results.length > 0 ? Math.round(correct / results.length * 100) : 0}%</span></span>
            </div>
            <div className="done-grid two">
              <div className="cell good"><span className="num">{correct}</span><span>{S.quiz.correctLabel}</span></div>
              <div className="cell again"><span className="num">{results.length - correct}</span><span>{S.quiz.wrongLabel}</span></div>
            </div>
            <div className="flex gap-2 w-full mt-2">
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
          <button className="tb-btn" onClick={() => goBack()} aria-label={S.quizPage.back}><BackIcon /></button>
          <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{chapter || getSubjectDisplayName(subject)}{S.quizPage.subjectHeadingSuffix}</h1>
        </div>
        <div className="page-scroll">
          <div className="empty">
            <div className="glyph">?</div>
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
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.quizPage.closeMenu} />
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
            <span><span className="font-zh">{S.quizPage.choiceLabel}</span> · {S.quizPage.choiceKeyLabel}{isMultiAnswer(currentQuestion) && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4 }}>{S.quizPage.multiAnswerBadge}</span>}</span>
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
          <div className="ornament" />
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
