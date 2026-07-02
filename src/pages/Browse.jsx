import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getCards, toggleStar, toggleSuspended } from '../lib/storage'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { BackIcon, ArrowLIcon, ArrowRIcon } from '../components/Icons'
import { useBackButton } from '../lib/useBackButton'
import '../styles/markdown.css'

function CardFace({ card }) {
  const frontHtml = useRenderedMarkdown(card.front)
  const backHtml = useRenderedMarkdown(card.back)

  return (
    <>
      {/* FRONT */}
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
        <div className="h-full relative flex flex-col"
          style={{ padding: '22px 20px 20px' }}>
          <div className="absolute top-[14px] left-4 font-mono text-[9px] tracking-[0.18em] text-ink-3 uppercase flex gap-1.5 items-center">
            <span style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.02em' }}>Q</span><span>FRONT</span>
          </div>
          <div className="flex-1 flex flex-col items-stretch justify-start text-left gap-3.5 p-2 pt-8 pb-6">
            <div className="card-content font-zh text-[18px] font-medium leading-relaxed tracking-wide"
              style={{ color: 'var(--ink)' }}
              dangerouslySetInnerHTML={{ __html: frontHtml }} />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--ink-4), transparent)' }} />
        </div>
      </div>
      {/* BACK */}
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <div className="h-full relative flex flex-col"
          style={{ padding: '22px 20px 20px' }}>
          <div className="absolute top-[14px] left-4 font-mono text-[9px] tracking-[0.18em] text-ink-3 uppercase flex gap-1.5 items-center">
            <span style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.02em' }}>A</span><span>BACK</span>
          </div>
              <div className="flex-1 flex flex-col items-stretch justify-start text-left gap-3.5 p-2 pt-8 pb-6">
            <div className="card-content font-zh text-[16px] text-ink-2"
              style={{ maxHeight: '20vh', overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: frontHtml }} />
            <div className="w-full px-2 flex items-center gap-2.5 font-mono text-[9px] text-ink-3 tracking-[0.18em] uppercase">
              <span className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
              REVERSO
              <span className="flex-1 h-px" style={{ background: 'var(--border-soft)' }} />
            </div>
            <div className="card-content font-zh text-base leading-[1.85] text-teal text-left self-stretch tracking-wide"
              style={{ maxHeight: '35vh', overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: backHtml }} />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, var(--ink-4), transparent)' }} />
        </div>
      </div>
    </>
  )
}

export default function Browse() {
  const { id } = useParams()
  const { goBack } = useBackButton()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const touchStartX = useRef(null)

  useEffect(() => {
    setCards(getCards(id))
    setCurrentIndex(0)
  }, [id])

  useEffect(() => {
    setFlipped(false)
  }, [currentIndex])

  const goNext = useCallback(() => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, cards.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowRight') goNext()
    else if (e.key === 'ArrowLeft') goPrev()
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setFlipped((f) => !f)
    }
  }, [goNext, goPrev])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 60) {
      if (dx > 0) goPrev()
      else goNext()
    }
    touchStartX.current = null
  }

  if (!cards.length) {
    return (
      <div className="page-fill">
        <header className="topbar">
          <button onClick={goBack} className="tb-btn">
            <BackIcon />
          </button>
          <h1 className="flex-1 font-zh text-[17px] font-medium text-ink pl-1">Browse</h1>
        </header>
        <div className="empty">
          <div className="glyph">∅</div>
          <div className="msg">暂无卡片</div>
          <div className="motto-zh">导入或新建卡片</div>
        </div>
      </div>
    )
  }

  const card = cards[currentIndex]

  return (
    <div className="page-fill">
      {/* Header */}
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        <span className="font-mono text-[11px]">
          <span className="text-ink font-semibold">{currentIndex + 1}</span>
          <span className="text-ink-3"> / {cards.length}</span>
        </span>
        <button onClick={() => {
          toggleStar(card.id)
          setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, starred: !c.starred } : c))
        }}
          className="tb-btn"
          style={{ color: card.starred ? 'var(--accent)' : 'var(--ink-3)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={card.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z"/>
          </svg>
        </button>
        <button onClick={() => {
          const suspended = toggleSuspended(card.id)
          setCards(prev => prev.map((c, i) => i === currentIndex ? { ...c, suspended } : c))
        }}
          className="tb-btn font-mono text-[9px] tracking-wider"
          style={{ color: card.suspended ? 'var(--warn)' : 'var(--ink-3)' }}>
          {card.suspended ? '恢复' : '暂停'}
        </button>
      </header>

      {/* Breadcrumb */}
      {(card.chapter || card.section || card.suspended || card.leech) && (
        <div className="px-[18px] pt-3 flex items-center justify-between font-mono text-[11px] text-ink-3">
          <span className="font-zh text-ink-2 text-xs flex items-center gap-1.5">
            {card.chapter}{card.section && <><span className="text-ink-4 mx-1">›</span>{card.section}</>}
            {card.suspended && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'var(--warn-soft, #fef3c7)', color: 'var(--warn, #d97706)' }}>已暂停</span>}
            {card.leech && <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>LEECH</span>}
          </span>
          <span className="tracking-wider">BROWSE</span>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 min-h-0 flex flex-col p-[18px] gap-3.5"
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Card container — outside 3D flip so bg/border/shadow render reliably */}
        <div className="flex-1 relative overflow-hidden cursor-pointer"
          onClick={() => setFlipped(f => !f)}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-md)',
            opacity: card.suspended ? 0.5 : 1,
          }}>
          <div style={{ perspective: 1400 }} className="w-full h-full">
            <div className="w-full h-full relative transition-transform duration-[480ms]"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transitionTimingFunction: 'cubic-bezier(.4,.2,.2,1)',
              }}>
              <CardFace card={card} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2 px-[18px] pb-[18px]">
        <button onClick={goPrev} disabled={currentIndex === 0}
          className="inline-flex items-center justify-center gap-1.5 py-3 rounded-md font-medium text-sm font-body border text-ink-2 active:scale-[0.97] transition-all disabled:opacity-30"
          style={{ borderColor: 'var(--border)' }}>
          <ArrowLIcon size={16} /> 上一张
        </button>
        <button onClick={goNext} disabled={currentIndex >= cards.length - 1}
          className="inline-flex items-center justify-center gap-1.5 py-3 rounded-md font-medium text-sm font-body border text-ink-2 active:scale-[0.97] transition-all disabled:opacity-30"
          style={{ borderColor: 'var(--border)' }}>
          下一张 <ArrowRIcon size={16} />
        </button>
      </div>
    </div>
  )
}
