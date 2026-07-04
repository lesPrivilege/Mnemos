import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect, useCallback, useRef } from 'react'
import ReviewCard from '../components/ReviewCard'
import { BackIcon, CheckIcon } from '../components/Icons'
import { getDueCards } from '../lib/scheduler'
import { getCards, getDeck, updateCardSM2, getCardSM2, restoreCardSM2, toggleStar } from '../lib/storage'
import { sm2 } from '../lib/sm2'
import { shuffle } from '../lib/utils'
import { isRecall } from '../lib/cardUtils'
import { useBackButton } from '../lib/useBackButton'
import { addReviewEntry } from '../lib/reviewLog'
import { saveReviewSession, clearReviewSession } from '../lib/reviewSession'
import { hapticLight, hapticSuccess, hapticWarning } from '../lib/haptics'

function predictInterval(card, quality, passCount) {
  // Learning card first pass Good: reinserts, doesn't schedule
  if (card.repetitions === 0 && quality === 4 && passCount === 0) return '稍后'
  const result = sm2(card, quality)
  return result.interval
}

const UNDO_LABELS = { 1: '重来', 2: '困难', 4: '记住', 5: '容易' }

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
          showToast('卡片已标记为顽固卡并暂停 · LEECH')
          hapticWarning()
        }
      }
      updateCardSM2(card.id, { ...result, ...extras })
      if (quality === 1) reinserted = true // Again requeue
    }

    // 2. 記錄日誌
    addReviewEntry({ type: 'flashcard', quality, itemId: card.id, deckId: id })

    // 3. 存 undo ref
    const reinsertedAt = reinserted ? Math.min(currentIndex + 3, dueCards.length) : -1
    lastRef.current = {
      cardId: card.id, prevSM2, quality, removedCard: { ...card },
      requeued: reinserted, reinsertedAt, passDelta, graduated,
    }
    showToast(`已評分 · ${UNDO_LABELS[quality]}`)
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

    setToast('已撤銷')
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

    return (
      <div className="page-fixed" style={{ background: 'var(--bg)' }}>
        <div className="topbar">
          <button onClick={goBack} className="tb-btn"><BackIcon /></button>
        </div>
        <div className="page-scroll">
          <div className="done-wrap">
            <div className="done-mark">
              <CheckIcon size={32} />
            </div>
            <div className="done-title">Mnēmosúnē</div>
            <div className="done-zh">今日复习完成</div>

            {total > 0 && (
              <>
                <div className="done-stats">
                  <span>已复习 <span className="v">{total}</span></span>
                  <span>正确率 <span className="v">{correctRate}%</span></span>
                </div>
                <div className="done-grid">
                  <div className="cell again"><span className="num">{stats.again}</span><span>重来</span></div>
                  <div className="cell hard"><span className="num">{stats.hard}</span><span>困难</span></div>
                  <div className="cell good"><span className="num">{stats.good}</span><span>记住</span></div>
                  <div className="cell easy"><span className="num">{stats.easy}</span><span>容易</span></div>
                </div>
              </>
            )}

            <div className="flex gap-2 w-full mt-2">
              {lastRef.current && (
                <button className="btn btn-ghost btn-block" onClick={handleUndo}>撤销上一张</button>
              )}
              <button className="btn btn-ghost btn-block" onClick={goBack}>返回卡组</button>
              <Link to={`/browse/${id}`} className="btn btn-accent btn-block">浏览卡片</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const card = dueCards[currentIndex]
  const isLearning = card.repetitions === 0
  const passCount = passesRef.current.get(card.id) || 0

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <span className="tb-text" style={{ flex: 1, textAlign: 'center' }}>
          {deckName || '复习'}
        </span>
        <button onClick={() => {
          toggleStar(card.id)
          setDueCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c))
        }}
          className="tb-btn"
          style={{ color: card.starred ? 'var(--accent)' : 'var(--ink-3)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24"
            fill={card.starred ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="rv-progress">
        <div className="bar" style={{ width: `${(currentIndex / dueCards.length) * 100}%` }} />
      </div>

      {/* Meta */}
      <div className="rv-meta">
        <span className="crumb">
          {card.chapter && <>{card.chapter}{card.section && <span className="div">/</span>}{card.section}</>}
          {isLearning && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>学习中 · {passCount + 1}/2</span>}
        </span>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(dueCards.length).padStart(2, '0')}
        </span>
      </div>

      {/* Card — scrollable internally */}
      <div className="rv-card-wrap page-scroll"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={swipeOffset ? {
          transform: `translateX(${swipeOffset}px) rotate(${swipeOffset / 40}deg)`,
          transition: swipeRef.current.committed ? 'transform 180ms ease-out' : (Math.abs(swipeOffset) < 5 ? 'transform 150ms ease-out' : 'none'),
        } : undefined}>
        <ReviewCard
          card={card}
          index={currentIndex}
          total={dueCards.length}
          flipped={flipped}
          onFlip={handleFlip}
          swipeOffset={swipeOffset}
        />
      </div>

      {/* Fixed bottom rating buttons */}
      <div className="rate shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        <button onClick={() => handleRate(1)} className="rate-btn rate-again">
          <span>重来</span><span className="iv">{predictInterval(card, 1, passCount)}d</span>
        </button>
        <button onClick={() => handleRate(2)} className="rate-btn rate-hard">
          <span>困难</span><span className="iv">{predictInterval(card, 2, passCount)}d</span>
        </button>
        <button onClick={() => handleRate(4)} className="rate-btn rate-good">
          <span>记住</span><span className="iv">{predictInterval(card, 4, passCount) === '稍后' ? '稍后' : `${predictInterval(card, 4, passCount)}d`}</span>
        </button>
        <button onClick={() => handleRate(5)} className="rate-btn rate-easy">
          <span>容易</span><span className="iv">{predictInterval(card, 5, passCount)}d</span>
        </button>
      </div>

      {/* Undo toast */}
      {toast && (
        <div onClick={handleUndo}
          style={{
            position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--ink)', color: 'var(--bg)',
            padding: '8px 16px', borderRadius: 999, fontSize: 12,
            fontFamily: 'var(--font-zh)', cursor: 'pointer',
            boxShadow: 'var(--shadow-md)', zIndex: 50,
            animation: 'fadeIn 150ms ease-out',
          }}>
          {toast} <span style={{ opacity: 0.6, marginLeft: 6 }}>撤销</span>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  )
}
