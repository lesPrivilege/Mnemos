import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import ReviewCard from '../components/ReviewCard'
import { BackIcon, CheckIcon, AlertIcon } from '../components/Icons'
import { getDueCards } from '../lib/scheduler'
import { getCards, getDeck, updateCardSM2, getCardSM2, restoreCardSM2, toggleStar } from '../lib/storage'
import { sm2 } from '../lib/sm2'
import { shuffle } from '../lib/utils'
import { isRecall } from '../lib/cardUtils'
import { useBackButton } from '../lib/useBackButton'
import { recordEvent } from '../lib/derive/events'
import { sessionSummary, todayFocus } from '../lib/derive'
import { saveReviewSession, clearReviewSession } from '../lib/reviewSession'
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics'
import { S } from '../lib/strings'

const UNDO_LABELS = { 1: S.review.again, 2: S.review.hard, 4: S.review.remember, 5: S.review.easy }
const RATE_KEYS = { 1: '1', 2: '2', 4: '4', 5: '5' }

/** 时长成句：不足一分只报秒，逾一分报「N 分 M 秒」——完成屏读的是节奏不是精度。 */
function formatDuration(ms) {
  if (!ms || ms < 1000) return S.review.durationInstant
  const secs = Math.round(ms / 1000)
  if (secs < 60) return S.review.durationSecs(secs)
  return S.review.durationMins(Math.floor(secs / 60), secs % 60)
}

export default function Review() {
  const { id } = useParams()
  const { goBack } = useBackButton()
  const [searchParams] = useSearchParams()
  const reviewAll = searchParams.get('all') === 'true'
  const [dueCards, setDueCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 })
  const [deckName, setDeckName] = useState('')
  const [flipped, setFlipped] = useState(false)
  const flippedRef = useRef(false)
  useEffect(() => { flippedRef.current = flipped }, [flipped])
  const [toast, setToast] = useState(null)
  const lastRef = useRef(null)
  const completedRef = useRef(false)
  const toastTimer = useRef(null)
  const initialCountRef = useRef(0)
  const ratedCountRef = useRef(0)
  const passesRef = useRef(new Map()) // cardId → successful passes this session
  // Swipe gesture state
  const swipeRef = useRef({ startX: 0, startY: 0, locked: false, committed: false })
  const [swipeOffset, setSwipeOffset] = useState(0)

  const handleFlip = useCallback((val) => {
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
    setDueCards(cards)
    setStats({ again: 0, hard: 0, good: 0, easy: 0 })
    setFlipped(false)
    completedRef.current = false
    initialCountRef.current = cards.length
    ratedCountRef.current = 0
    passesRef.current.clear()

    return () => {
      if (!completedRef.current && cards.length > 0) {
        const remaining = Math.max(0, initialCountRef.current - ratedCountRef.current)
        saveReviewSession({ deckId: id, deckName: deck?.name || '', dueCount: remaining || cards.length })
      }
    }
  }, [id, reviewAll])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const handleRate = useCallback((quality) => {
    const card = dueCards[currentIndex]
    if (!card) return
    // 未见答不评：评分是对照答案后的裁决（记-08）
    if (!flippedRef.current) return

    // 1. 存 undo 狀態
    const prevSM2 = getCardSM2(card.id)
    ratedCountRef.current++

    const isLearning = card.repetitions === 0
    const passCount = passesRef.current.get(card.id) || 0
    let graduated = false
    let reinserted = false
    let passDelta = 0

    if (isLearning && quality >= 4) {
      // Learning card — success path
      if (quality === 5 || passCount >= 1) {
        // Easy on first pass OR second pass → graduate
        const result = sm2(card, quality)
        updateCardSM2(card.id, result)
        graduated = true
        passesRef.current.delete(card.id)
      } else {
        // First Good pass → reinsert ~3 ahead, don't write SM-2 yet
        passDelta = 1
        passesRef.current.set(card.id, passCount + 1)
        reinserted = true
      }
    } else if (isLearning && quality <= 2) {
      // Learning card — fail (Again or Hard): requeue without SM-2 write
      reinserted = true
      // Reset pass count on failure
      if (passCount > 0) { passDelta = -passCount; passesRef.current.set(card.id, 0) }
    } else {
      // Mature card or non-learning: standard SM-2
      const result = sm2(card, quality)
      const extras = {}
      // Lapse counting: quality === 1 on a card that had repetitions > 0
      if (quality === 1 && card.repetitions > 0) {
        const newLapses = (card.lapses ?? 0) + 1
        extras.lapses = newLapses
        if (newLapses >= 8 && !(card.leech)) {
          extras.leech = true
          extras.suspended = true
          showToast(S.review.leechToast)
          hapticWarning()
        }
      }
      updateCardSM2(card.id, { ...result, ...extras })
      if (quality === 1) reinserted = true // Again requeue
    }

    // 2. 記錄日誌
    recordEvent({ module: 'recall', quality, itemId: card.id, deckId: id })

    // 3. 存 undo ref
    const reinsertedAt = reinserted ? Math.min(currentIndex + 3, dueCards.length) : -1
    lastRef.current = {
      cardId: card.id, prevSM2, quality, removedCard: { ...card },
      requeued: reinserted, reinsertedAt, passDelta, graduated,
    }
    showToast(`${S.review.ratedToastPrefix}${UNDO_LABELS[quality]}`)
    hapticLight()

    // 4. 更新 stats
    setStats(prev => {
      const next = { ...prev }
      if (quality === 1) next.again++
      else if (quality === 2) next.hard++
      else if (quality === 4) next.good++
      else if (quality === 5) next.easy++
      return next
    })

    // 5. 推進卡片
    setFlipped(false)
    if (reinserted) {
      const insertAt = Math.min(currentIndex + 3, dueCards.length)
      setDueCards(prev => {
        const next = [...prev]
        next.splice(insertAt, 0, { ...card })
        return next
      })
      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setCurrentIndex(dueCards.length) // index after the reinserted copy
      }
    } else if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      completedRef.current = true
      setDueCards([])
    }
  }, [dueCards, currentIndex, id, showToast])

  const handleUndo = useCallback(() => {
    const last = lastRef.current
    if (!last) return
    ratedCountRef.current = Math.max(0, ratedCountRef.current - 1)

    // Restore pass count
    if (last.passDelta !== 0) {
      const cur = passesRef.current.get(last.cardId) || 0
      const restored = cur + last.passDelta
      if (restored <= 0) passesRef.current.delete(last.cardId)
      else passesRef.current.set(last.cardId, restored)
    }

    // Restore card state (SM-2 or just the original card for non-graduated learning)
    if (last.graduated) {
      restoreCardSM2(last.cardId, last.prevSM2)
    } else if (!last.requeued) {
      // Non-requeued non-graduated (shouldn't happen, but safe fallback)
      restoreCardSM2(last.cardId, last.prevSM2)
    }
    // For requeued non-graduated: the card was never written, just remove the copy

    lastRef.current = null

    // 回退 stats
    setStats(prev => {
      const next = { ...prev }
      if (last.quality === 1) next.again = Math.max(0, next.again - 1)
      else if (last.quality === 2) next.hard = Math.max(0, next.hard - 1)
      else if (last.quality === 4) next.good = Math.max(0, next.good - 1)
      else if (last.quality === 5) next.easy = Math.max(0, next.easy - 1)
      return next
    })

    if (last.requeued) {
      // Remove the reinserted copy and step back
      const removeAt = last.reinsertedAt >= 0 ? last.reinsertedAt : dueCards.length - 1
      setDueCards(prev => {
        const next = [...prev]
        next.splice(removeAt, 1)
        return next
      })
      setCurrentIndex(prev => Math.max(0, prev - 1))
      setFlipped(true)
      completedRef.current = false
    } else if (dueCards.length === 0 && last.removedCard) {
      // Last card was rated — rebuild one-card queue
      setDueCards([last.removedCard])
      setCurrentIndex(0)
      setFlipped(true)
      completedRef.current = false
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setFlipped(true)
    }

    setToast(S.review.undoToast)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [currentIndex, dueCards.length])

  const handleKeyDown = useCallback((e) => {
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

  // Swipe gesture handlers (active only when flipped)
  const handleTouchStart = useCallback((e) => {
    if (!flipped) return
    const t = e.touches[0]
    swipeRef.current = { startX: t.clientX, startY: t.clientY, locked: false, committed: false }
  }, [flipped])

  const handleTouchMove = useCallback((e) => {
    if (!flipped) return
    const t = e.touches[0]
    const dx = t.clientX - swipeRef.current.startX
    const dy = t.clientY - swipeRef.current.startY
    if (!swipeRef.current.locked) {
      if (Math.abs(dx) > 24 && Math.abs(dx) > 2 * Math.abs(dy)) {
        swipeRef.current.locked = true
      } else {
        return
      }
    }
    e.preventDefault()
    setSwipeOffset(dx)
  }, [flipped])

  const handleTouchEnd = useCallback(() => {
    if (!flipped || !swipeRef.current.locked) { setSwipeOffset(0); return }
    const cardWidth = 320 // approximate; threshold = min(96, 30% of card width)
    const threshold = Math.min(96, cardWidth * 0.3)
    if (Math.abs(swipeOffset) >= threshold) {
      swipeRef.current.committed = true
      hapticLight()
      // Animate off-screen then rate
      const target = swipeOffset > 0 ? 400 : -400
      setSwipeOffset(target)
      setTimeout(() => {
        setSwipeOffset(0)
        handleRate(swipeOffset > 0 ? 4 : 1)
      }, 180)
    } else {
      setSwipeOffset(0)
    }
  }, [flipped, swipeOffset, handleRate])

  // Clear saved session when review completes
  useEffect(() => {
    if (dueCards.length === 0) {
      completedRef.current = true
      clearReviewSession()
      hapticSuccess()
    }
  }, [dueCards.length])

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

    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button onClick={goBack} className="tb-btn"><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark"><CheckIcon size={20} sw={2} /></div>
            <div className="done-title">{S.review.doneTitle}</div>
            <div className="done-sum">{S.review.doneSummary(total, formatDuration(summary?.durationMs))}</div>

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

            <div className="done-actions">
              {lastRef.current && (
                <button className="btn btn-ghost" onClick={handleUndo}>{S.review.undoLastCard}</button>
              )}
              <Link to={`/browse/${id}`} className="btn btn-ghost">{S.review.browseCards}</Link>
              {nextDeck
                ? <Link to={`/review/${nextDeck.deckId}`} className="btn btn-primary">{S.review.continueNext(nextDeck.name)}</Link>
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
        <button onClick={goBack} className="rv-meta-btn" aria-label={S.review.leaveReview}>
          <BackIcon size={15} />
        </button>
        <span className="crumb">
          {deckName || S.review.title}
          {card.chapter && <><span className="div">·</span>{card.chapter}</>}
          {isLearning && <><span className="div">·</span><span className="learning">{S.review.learningPrefix}{passCount + 1}/2</span></>}
        </span>
        <button onClick={() => {
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
      <div className="rv-gesture"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={swipeOffset ? {
          transform: `translateX(${swipeOffset}px) rotate(${swipeOffset / 40}deg)`,
          transition: swipeRef.current.committed ? 'transform var(--motion-mid)' : (Math.abs(swipeOffset) < 5 ? 'transform var(--motion-quick)' : 'none'),
        } : undefined}>
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
            swipeOffset={swipeOffset}
          />
        )}
      </div>

      {/* Fixed bottom rating buttons */}
      <div className="rate shrink-0" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <button onClick={() => handleRate(1)} disabled={!flipped || unreadable} className="rate-btn rate-again">
          <span>{S.review.again}</span><span className="k">{RATE_KEYS[1]}</span>
        </button>
        <button onClick={() => handleRate(2)} disabled={!flipped || unreadable} className="rate-btn rate-hard">
          <span>{S.review.hard}</span><span className="k">{RATE_KEYS[2]}</span>
        </button>
        <button onClick={() => handleRate(4)} disabled={!flipped || unreadable} className="rate-btn rate-good">
          <span>{S.review.remember}</span><span className="k">{RATE_KEYS[4]}</span>
        </button>
        <button onClick={() => handleRate(5)} disabled={!flipped || unreadable} className="rate-btn rate-easy">
          <span>{S.review.easy}</span><span className="k">{RATE_KEYS[5]}</span>
        </button>
      </div>

      {/* Undo toast */}
      {toast && (
        <div onClick={handleUndo}
          style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--bg)',
            padding: '8px 16px', borderRadius: 999, fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-ui)', cursor: 'pointer',
            boxShadow: 'var(--shadow-md)', zIndex: 50,
            animation: 'fadeIn var(--motion-mid)',
          }}>
          {toast} <span style={{ opacity: 0.6, marginLeft: 6 }}>{S.review.undoToastLabel}</span>
        </div>
      )}

    </div>
  )
}
