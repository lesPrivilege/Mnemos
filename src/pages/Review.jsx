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

function predictInterval(card, quality) {
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

    return () => {
      if (!completedRef.current && cards.length > 0) {
        saveReviewSession({ deckId: id, deckName: deck?.name || '', dueCount: cards.length })
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

    // 2. 應用 SM-2
    const result = sm2(card, quality)
    updateCardSM2(card.id, result)

    // 3. 記錄日誌
    addReviewEntry({ type: 'flashcard', quality, itemId: card.id, deckId: id })

    // 4. 存 undo ref — 帶上被移除的卡片
    lastRef.current = { cardId: card.id, prevSM2, quality, removedCard: { ...card } }
    showToast(`已評分 · ${UNDO_LABELS[quality]}`)

    // 5. 更新 stats
    setStats(prev => {
      const next = { ...prev }
      if (quality === 1) next.again++
      else if (quality === 2) next.hard++
      else if (quality === 4) next.good++
      else if (quality === 5) next.easy++
      return next
    })

    // 6. 推進卡片
    setFlipped(false)
    if (currentIndex + 1 < dueCards.length) {
      setCurrentIndex(currentIndex + 1)
    } else {
      completedRef.current = true
      setDueCards([])
    }
  }, [dueCards, currentIndex, id, showToast])

  const handleUndo = useCallback(() => {
    const last = lastRef.current
    if (!last) return
    restoreCardSM2(last.cardId, last.prevSM2)
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

    // 如果已推進到下一張，回退
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setFlipped(true)
    }

    setToast('已撤銷')
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2000)
  }, [currentIndex])

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
      setFlipped(f => !f)
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
    if (dueCards.length === 0) {
      completedRef.current = true
      clearReviewSession()
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
              <button className="btn btn-ghost btn-block" onClick={goBack}>返回卡组</button>
              <Link to={`/browse/${id}`} className="btn btn-accent btn-block">浏览卡片</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const card = dueCards[currentIndex]

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
        </span>
        <span className="pos">
          <span className="now">{String(currentIndex + 1).padStart(2, '0')}</span> / {String(dueCards.length).padStart(2, '0')}
        </span>
      </div>

      {/* Card — scrollable internally */}
      <div className="rv-card-wrap page-scroll">
        <ReviewCard
          card={card}
          index={currentIndex}
          total={dueCards.length}
          flipped={flipped}
          onFlip={setFlipped}
        />
      </div>

      {/* Fixed bottom rating buttons */}
      <div className="rate shrink-0" style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}>
        <button onClick={() => handleRate(1)} className="rate-btn rate-again">
          <span>重来</span><span className="iv">{predictInterval(card, 1)}d</span>
        </button>
        <button onClick={() => handleRate(2)} className="rate-btn rate-hard">
          <span>困难</span><span className="iv">{predictInterval(card, 2)}d</span>
        </button>
        <button onClick={() => handleRate(4)} className="rate-btn rate-good">
          <span>记住</span><span className="iv">{predictInterval(card, 4)}d</span>
        </button>
        <button onClick={() => handleRate(5)} className="rate-btn rate-easy">
          <span>容易</span><span className="iv">{predictInterval(card, 5)}d</span>
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
