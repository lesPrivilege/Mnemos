import SourceLens from '../components/SourceLens'
import { loadSourceDocument } from '../reading/lib/loadSourceDocument'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import ReviewCard from '../components/ReviewCard'
import RatingRail from '../components/RatingRail'
import { BackIcon, CheckIcon, AlertIcon } from '../components/Icons'
import { getDueCards } from '../lib/scheduler'
import { getCards, getDeck, toggleStar } from '../lib/storage'
import { commitRating, undoRating } from '../lib/reviewAction'
import { shuffle } from '../lib/utils'
import { isRecall } from '../lib/cardUtils'
import { useBackButton } from '../lib/useBackButton'
import { sessionSummary, todayFocus } from '../lib/derive'
import { todayJourney } from '../lib/derive/today'
import { saveReviewSession, clearReviewSession } from '../lib/reviewSession'
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics'
import { S } from '../lib/strings'

const UNDO_LABELS = { 1: S.review.again, 2: S.review.hard, 4: S.review.remember, 5: S.review.easy }

/** 时长成句：不足一分只报秒，逾一分报「N 分 M 秒」——完成屏读的是节奏不是精度。 */
function formatDuration(ms) {
  if (!ms || ms < 1000) return S.review.durationInstant
  const secs = Math.round(ms / 1000)
  if (secs < 60) return S.review.durationSecs(secs)
  return S.review.durationMins(Math.floor(secs / 60), secs % 60)
}

export default function Review() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const reviewAll = searchParams.get('all') === 'true'
  const [dueCards, setDueCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [deckName, setDeckName] = useState('')
  const [flipped, setFlipped] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(false)
  const flippedRef = useRef(false)
  useEffect(() => { flippedRef.current = flipped }, [flipped])
  const [toast, setToast] = useState(null)
  const lastRef = useRef(null)
  const completedRef = useRef(false)
  const toastTimer = useRef(null)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const actionLock = useRef(false)
  const { goBack } = useBackButton({ canLeave: () => !actionLock.current })
  const [faulted, setFaulted] = useState(false)
  const remainingRef = useRef(0)
  const finishedRef = useRef(new Set())
  const passesRef = useRef(new Map()) // cardId → successful passes this session
  const handleFlip = useCallback((val) => {
    if (actionLock.current) return
    flippedRef.current = val
    setFlipped(val)
    if (val) hapticLight()
  }, [])

  useEffect(() => {
    const deck = getDeck(id)
    setDeckName(deck?.name || '')
    let cards
    if (reviewAll) {
      cards = shuffle(getCards(id).filter(c => isRecall(c)))
    } else {
      cards = shuffle(getDueCards(id))
    }
    setFaulted(false); setError(''); setToast(null)
    setDueCards(cards)
    setStats({ again: 0, hard: 0, good: 0, easy: 0 })
    setFlipped(false)
    completedRef.current = false
    remainingRef.current = cards.length
    setCurrentIndex(0)
    lastRef.current = null
    setReady(true)
    passesRef.current.clear()
    finishedRef.current.clear()

    return () => {
      clearTimeout(toastTimer.current)
      if (!completedRef.current && cards.length > 0) {
        saveReviewSession({ deckId: id, deckName: deck?.name || '', dueCount: remainingRef.current })
      }
    }
  }, [id, reviewAll])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const handleRate = useCallback(async (quality) => {
    const card = dueCards[currentIndex]
    if (!card || !flippedRef.current || faulted || actionLock.current || ![1, 2, 4, 5].includes(quality)) return
    actionLock.current = true
    setPending(true); setError('')
    try {
      const action = await commitRating(card, quality, passesRef.current.get(card.id) || 0, id)
      lastRef.current = { action, cardId: card.id, queue: dueCards, index: currentIndex, stats, passes: new Map(passesRef.current), finished: new Set(finishedRef.current) }
      passesRef.current.set(card.id, action.passes)
      if (!action.requeue && !action.card.suspended) finishedRef.current.add(card.id)
      const next = [...dueCards]
      if (action.requeue) next.splice(Math.min(currentIndex + 3, next.length), 0, action.card)
      const nextIndex = currentIndex + 1
      remainingRef.current = Math.max(0, next.length - nextIndex)
      completedRef.current = remainingRef.current === 0
      setDueCards(completedRef.current ? [] : next)
      setCurrentIndex(completedRef.current ? 0 : nextIndex)
      setStats(prev => ({ ...prev, [{ 1: 'again', 2: 'hard', 4: 'good', 5: 'easy' }[quality]]: prev[{ 1: 'again', 2: 'hard', 4: 'good', 5: 'easy' }[quality]] + 1 }))
      flippedRef.current = false; setFlipped(false)
      showToast(action.card.suspended ? S.review.leechToast : `${S.review.ratedToastPrefix}${UNDO_LABELS[quality]}`)
      if (action.card.suspended) hapticWarning(); else hapticLight()
    } catch (error) { if (error.requiresReload) setFaulted(true); setError(error.message || '保存失败，请重试。') }
    finally { actionLock.current = false; setPending(false) }
  }, [dueCards, currentIndex, id, stats, showToast, faulted])

  const handleUndo = useCallback(async () => {
    const last = lastRef.current
    if (!last || faulted || actionLock.current) return
    actionLock.current = true; setPending(true); setError('')
    try {
      await undoRating(last.action, last.cardId)
      passesRef.current = new Map(last.passes)
      finishedRef.current = new Set(last.finished)
      const currentCards = new Map(getCards(id).map(card => [card.id, card]))
      setDueCards(last.queue.map(card => ({ ...card, ...currentCards.get(card.id) }))); setCurrentIndex(last.index); setStats(last.stats)
      remainingRef.current = last.queue.length - last.index
      completedRef.current = false
      lastRef.current = null
      flippedRef.current = true; setFlipped(true)
      showToast(S.review.undoToast)
    } catch (error) { if (error.requiresReload) setFaulted(true); setError(error.message || '撤销失败，请重试。') }
    finally { actionLock.current = false; setPending(false) }
  }, [showToast, faulted, id])

  const handleKeyDown = useCallback((e) => {
    if (e.repeat || e.isComposing || document.querySelector('[role="dialog"]') || e.target.closest?.('button, a, input, textarea, select, summary')) return
    // Undo: Ctrl+Z / Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault()
      handleUndo()
      return
    }
    if (dueCards.length === 0) return
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleFlip(!flipped)
    } else if (flipped && ['1', '2', '4', '5'].includes(e.key)) {
      e.preventDefault()
      handleRate(Number(e.key))
    } else if (e.key === 'ArrowRight' && flipped) {
      e.preventDefault()
      handleRate(4)
    } else if (e.key === 'ArrowLeft' && flipped) {
      e.preventDefault()
      handleRate(1)
    }
  }, [flipped, dueCards.length, handleRate, handleUndo])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Clear saved session when review completes
  useEffect(() => {
    if (ready && dueCards.length === 0) {
      completedRef.current = true
      clearReviewSession()
      hapticSuccess()
    }
  }, [ready, dueCards.length])

  if (!ready) return <div role="status">正在准备复习…</div>

  // Done screen
  if (dueCards.length === 0) {
    const total = stats.again + stats.hard + stats.good + stats.easy
    const correctRate = total > 0 ? Math.round((stats.good + stats.easy) / total * 100) : 0
    // 会话小结出于事件流（记-30）：本次已写入，故 sessionSummary 之末场即此场
    const summary = total > 0 ? sessionSummary(id) : null
    // 下一处有到期者——完成之後最自然的下一步，非「返回」
    const focus = todayFocus()
    const nextDeck = focus.primary && focus.primary.deckId !== id && !focus.primary.all
      ? { deckId: focus.primary.deckId, name: focus.breakdown[0]?.name }
      : null
    const nextStage = nextDeck ? null : todayJourney().stages.find((stage) => stage.key !== 'recall' && stage.route)

    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button onClick={goBack} disabled={pending} className="tb-btn" aria-label={S.review.backToDeck}><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={20} sw={2} /></div>
            <div className="done-title">{S.review.doneTitle}</div>
            <div className="done-sum">{`完成 ${finishedRef.current.size} 项 · 评价 ${total} 次 · ${formatDuration(summary?.durationMs)}`}</div>

            {/* 关系式（版1）——替旧「两个孤立数 + 四格计数」。
                孤立的 24、92% 不回答任何问题；「较上次多 6 张」「↑4」
                「下次明天 09:00」才是。无可比者不编造比较（首场会话
                delta 为 null，整行不出）。 */}
            <div className="rel">
              {summary?.delta && (
                <div className="rel-row">
                  <span className="k">{S.review.vsLast}</span>
                  <span className="v">{S.review.deltaCards(summary.delta.count)}</span>
                </div>
              )}
              <div className="rel-row">
                <span className="k">{S.review.correctRate}</span>
                <span className="v">
                  {correctRate}%
                  {summary?.delta ? <em>{S.review.deltaPct(summary.delta.accuracy)}</em> : null}
                </span>
              </div>
              {stats.again > 0 && (
                <div className="rel-row">
                  <span className="k">{S.review.again}</span>
                  <span className="v">{S.review.againCount(stats.again)}</span>
                </div>
              )}
              {summary?.nextDue && (
                <div className="rel-row">
                  <span className="k">{S.review.nextDue}</span>
                  <span className="v">{S.review.nextDueValue(summary.nextDue.date, summary.nextDue.count)}</span>
                </div>
              )}
            </div>

            {error && <p role="alert">{error}</p>}
            <div className="done-actions">
              {lastRef.current && (
                <button className="btn btn-ghost" disabled={pending || faulted} onClick={handleUndo}>{S.review.undoLastCard}</button>
              )}
              <Link to={`/browse/${id}`} className="btn btn-ghost">{S.review.browseCards}</Link>
              {nextDeck
                ? <Link to={`/review/${nextDeck.deckId}`} className="btn btn-primary">{S.review.continueNext(nextDeck.name)}</Link>
                : nextStage
                  ? <Link to={nextStage.route} className="btn btn-primary">{S.review.continueToday(S.home.today.stageLabel[nextStage.key])}</Link>
                  : <button className="btn btn-primary" onClick={goBack}>{S.review.backToDeck}</button>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const card = dueCards[currentIndex]
  const isLearning = card.repetitions === 0
  const passCount = passesRef.current.get(card.id) || 0
  const unreadable = !card.back?.trim()

  const skipUnreadable = () => {
    if (actionLock.current) return
    remainingRef.current = Math.max(0, dueCards.length - currentIndex - 1)
    setFlipped(false)
    setDueCards((prev) => prev.filter((_, index) => index !== currentIndex))
    setCurrentIndex((prev) => Math.max(0, Math.min(prev, dueCards.length - 2)))
  }

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}>
      {/* Progress bar */}
      <div className="rv-progress">
        <div className="bar" style={{ transform: `scaleX(${dueCards.length ? (currentIndex + 1) / dueCards.length : 0})` }} />
      </div>

      {/* Meta */}
      <div className="rv-meta">
        <button onClick={goBack} disabled={pending} className="rv-meta-btn" aria-label={S.review.leaveReview}>
          <BackIcon size={15} />
        </button>
        <span className="crumb">
          {deckName || S.review.title}
          {card.chapter && <><span className="div">·</span>{card.chapter}</>}
          {isLearning && <><span className="div">·</span><span className="learning">{S.review.learningPrefix}{passCount + 1}/2</span></>}
        </span>
        <button disabled={pending} onClick={() => {
          if (actionLock.current) return
          toggleStar(card.id)
          setDueCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c))
        }}
          className="rv-meta-btn"
          aria-label={card.starred ? S.review.unstarCard : S.review.starCard}
          style={{ color: card.starred ? 'var(--accent)' : 'var(--ink-3)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24"
            fill={card.starred ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" />
          </svg>
        </button>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(dueCards.length).padStart(2, '0')}
        </span>
      </div>

      {/* Card — scrollable internally */}
      <div className="rv-gesture">
        {unreadable ? (
          <div className="rv-card-wrap">
            <div className="notice" role="alert">
              <span className="ic"><AlertIcon size={17} /></span>
              <div>
                <div className="t">{S.review.unreadableTitle}</div>
                <div className="d">{S.review.unreadableHint}</div>
                <div className="a">
                  <button onClick={skipUnreadable}>{S.review.nextCard}</button>
                  <Link to={`/deck/${id}`} className="ghost">{S.review.editCard}</Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ReviewCard
            card={card}
            flipped={flipped}
            onFlip={handleFlip}
          />
        )}
      </div>

      {card.source && <div className="reader-receipt"><button disabled={pending} onClick={() => setSourceOpen(true)}>查看原文</button></div>}
      <SourceLens source={card.source} open={sourceOpen} onClose={() => setSourceOpen(false)} loadDocument={loadSourceDocument} />

      {error && <p className="review-feedback" role="alert">{error}</p>}
      <RatingRail disabled={!flipped || unreadable || pending || faulted} onRate={handleRate}/>
      <div className="review-feedback" role="status">{pending ? '正在保存…' : toast}</div>
      {lastRef.current && <button className="btn btn-ghost review-undo" disabled={pending || faulted} onClick={handleUndo}>撤销上一张</button>}
    </div>
  )
}
