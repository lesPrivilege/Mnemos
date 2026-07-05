import { useState, useRef, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FlashcardHomeContent } from './FlashcardHomeContent'
import { QuizHomeContent } from './QuizHomeContent'
import ReadingHomeContent from '../reading/pages/ReadingHomeContent'
import { SearchIcon, SettingsIcon, MnemosMark } from '../components/Icons'
import { S } from '../lib/strings'

const homeTabKeys = ['quiz', 'flashcard', 'reading']

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(() => {
    const queryTab = new URLSearchParams(window.location.hash.split('?')[1] || '').get('tab')
    const saved = queryTab || sessionStorage.getItem('mnemos-home-tab')
    if (saved === 'flashcard') return 1
    if (saved === 'reading') return 2
    if (saved === 'quiz') return 0
    return 1 // default: 记忆 (middle)
  })
  const [drag, setDrag] = useState(null)
  const tabsRef = useRef(null)

  useEffect(() => {
    const queryTab = searchParams.get('tab')
    if (!queryTab) return
    const next = homeTabKeys.indexOf(queryTab)
    if (next >= 0) {
      setTab(next)
      sessionStorage.setItem('mnemos-home-tab', queryTab)
    }
  }, [searchParams])

  const switchTab = (t) => {
    setTab(t)
    setDrag(null)
    sessionStorage.setItem('mnemos-home-tab', homeTabKeys[t])
    navigate(`/?tab=${homeTabKeys[t]}`, { replace: true })
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
