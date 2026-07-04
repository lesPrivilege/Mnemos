import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FlashcardHomeContent } from './FlashcardHomeContent'
import { QuizHomeContent } from './QuizHomeContent'
import ReadingHomeContent from '../reading/pages/ReadingHomeContent'
import { SearchIcon, SettingsIcon, MnemosMark } from '../components/Icons'
import { S } from '../lib/strings'

export default function Home() {
  const [tab, setTab] = useState(() => {
    const saved = sessionStorage.getItem('mnemos-home-tab')
    if (saved === 'flashcard') return 1
    if (saved === 'reading') return 2
    if (saved === 'quiz') return 0
    return 1 // default: 记忆 (middle)
  })
  const [drag, setDrag] = useState(null)
  const tabsRef = useRef(null)

  const switchTab = (t) => {
    setTab(t)
    setDrag(null)
    sessionStorage.setItem('mnemos-home-tab', ['quiz', 'flashcard', 'reading'][t])
  }

  const onPanStart = useCallback((e) => {
    const t = e.touches ? e.touches[0] : e
    setDrag({ sx: t.clientX, sy: t.clientY, dx: 0, locked: null })
  }, [])

  const onPanMove = useCallback((e) => {
    if (!drag) return
    const t = e.touches ? e.touches[0] : e
    const dx = t.clientX - drag.sx
    const dy = t.clientY - drag.sy
    let locked = drag.locked
    if (locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (locked === 'x') {
      e.preventDefault?.()
      setDrag({ ...drag, dx, locked })
    } else if (locked !== drag.locked) {
      setDrag({ ...drag, locked })
    }
  }, [drag])

  const onPanEnd = useCallback(() => {
    if (!drag) return
    if (drag.locked === 'x') {
      const W = tabsRef.current?.offsetWidth || 324
      if (drag.dx < -W * 0.18) {
        if (tab < 2) switchTab(tab + 1)
      } else if (drag.dx > W * 0.18) {
        if (tab > 0) switchTab(tab - 1)
      }
    }
    setDrag(null)
  }, [drag, tab])

  const dragX = drag?.locked === 'x' ? drag.dx : 0
  const baseX = -tab * 100

  return (
    <div className="page-fill">
      {/* Topbar */}
      <header className="topbar">
        <h1>
          <MnemosMark size={20} accent="var(--accent)" />
          Mnemos
        </h1>
        <div className="tb-actions">
          <Link to="/search" className="tb-btn" aria-label={S.home.search}><SearchIcon size={18} /></Link>
          <Link to="/settings" className="tb-btn" aria-label={S.home.settings}><SettingsIcon size={18} /></Link>
        </div>
      </header>

      {/* Segmented tab header */}
      <div style={{ padding: '12px 0 0' }}>
        <div className="tabs-head">
          <button className={`tabs-tab ${tab === 0 ? 'on' : ''}`} onClick={() => switchTab(0)}>
            <span className="zh">{S.home.practiceZh}</span>
            <span className="en">PRACTICE</span>
          </button>
          <button className={`tabs-tab ${tab === 1 ? 'on' : ''}`} onClick={() => switchTab(1)}>
            <span className="zh">{S.home.recallZh}</span>
            <span className="en">RECALL</span>
          </button>
          <button className={`tabs-tab ${tab === 2 ? 'on' : ''}`} onClick={() => switchTab(2)}>
            <span className="zh">{S.home.readingZh}</span>
            <span className="en">READING</span>
          </button>
        </div>
      </div>

      {/* Slideable tab panes */}
      <div className="tabs-viewport"
        ref={tabsRef}
        onTouchStart={onPanStart} onTouchMove={onPanMove} onTouchEnd={onPanEnd}
        onMouseDown={onPanStart} onMouseMove={(e) => drag && onPanMove(e)} onMouseUp={onPanEnd} onMouseLeave={onPanEnd}
      >
        <div className="tabs-track" style={{
          transform: `translateX(calc(${baseX}% + ${dragX}px))`,
          transition: drag?.locked === 'x' ? 'none' : 'transform 360ms cubic-bezier(.2,.8,.2,1)',
        }}>
          <div className="tab-pane">
            {tab === 0 && <QuizHomeContent />}
          </div>
          <div className="tab-pane">
            {tab === 1 && <FlashcardHomeContent />}
          </div>
          <div className="tab-pane">
            {tab === 2 && <ReadingHomeContent />}
          </div>
        </div>
      </div>
    </div>
  )
}
