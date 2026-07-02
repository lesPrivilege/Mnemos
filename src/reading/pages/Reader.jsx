// Reader — immersive reading with auto-hide chrome
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, getDocumentContent, updateReadingProgress, getReadingSettings, updateReadingSettings } from '../lib/storage'
import { useBackButton } from '../../lib/useBackButton'
import { renderDoc, extractToc } from '../lib/renderDoc'
import { getHighlightsByDoc, addHighlight, deleteHighlight } from '../lib/highlights'
import { repaintHighlights } from '../lib/highlightAnchor'
import { getBookmarksByDoc, addBookmark, deleteBookmark } from '../lib/bookmarks'
import { startSession, endSession, markDocCompleted, touchSession } from '../lib/stats'
import { exportHighlightsMd } from '../lib/exportHighlights'
import { downloadBlob } from '../../lib/utils'
import ReaderToolbar from '../components/ReaderToolbar'
import { TocPanel, HighlightsPanel, BookmarksPanel } from '../components/ReaderPanels'
import '../../styles/markdown.css'
import '../styles/reader.css'

const BOTTOM_BTNS = [
  { key: 'toc',        label: 'TOC' },
  { key: 'highlights', label: '高亮' },
  { key: 'bookmarks',  label: '书签' },
]

export default function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const [doc, setDoc] = useState(null)
  const [html, setHtml] = useState('')
  const [toc, setToc] = useState([])
  const [settings, setSettings] = useState(getReadingSettings())
  const [activePanel, setActivePanel] = useState(null) // null | 'toc' | 'highlights' | 'bookmarks'
  const [showBars, setShowBars] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scrollPct, setScrollPct] = useState(0)
  const [selection, setSelection] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [toast, setToast] = useState(null)
  const scrollRef = useRef(null)
  const toastTimer = useRef(null)
  const persistTimer = useRef(null)
  const pendingPct = useRef(null)
  const completedRef = useRef(false)

  // ── Load document + session ─────────────────────────

  useEffect(() => {
    const d = getDocument(id)
    if (!d) { goBack(); return }
    setDoc(d)
    getDocumentContent(id).then(content => {
      renderDoc(content, d.format).then(h => { setHtml(h); setToc(extractToc(h)) })
    })
    setHighlights(getHighlightsByDoc(id))
    setBookmarks(getBookmarksByDoc(id))
    startSession(id)
    return () => {
      // Flush pending progress write
      if (persistTimer.current) { clearTimeout(persistTimer.current); persistTimer.current = null }
      if (pendingPct.current !== null) {
        updateReadingProgress(id, pendingPct.current)
        pendingPct.current = null
      }
      endSession()
    }
  }, [id, goBack])

  // ── Restore scroll ──────────────────────────────────

  useEffect(() => {
    if (!doc || !scrollRef.current) return
    const el = scrollRef.current
    requestAnimationFrame(() => {
      el.scrollTop = (doc.scrollPct / 100) * (el.scrollHeight - el.clientHeight || 1)
      setScrollPct(doc.scrollPct || 0)
    })
  }, [html])

  // ── Repaint highlights after render ─────────────────

  useEffect(() => {
    if (!html || !highlights.length) return
    const container = scrollRef.current?.querySelector('.card-content')
    if (container) repaintHighlights(container, highlights)
  }, [html, highlights])

  // ── Scroll + completion (throttled persistence) ─────

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !doc) return
    const el = scrollRef.current
    const pct = el.scrollHeight > el.clientHeight
      ? Math.round((el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100)
      : 0
    setScrollPct(pct)
    pendingPct.current = pct
    if (!persistTimer.current) {
      persistTimer.current = setTimeout(() => {
        persistTimer.current = null
        if (pendingPct.current !== null && doc) {
          updateReadingProgress(doc.id, pendingPct.current)
          touchSession()
          pendingPct.current = null
        }
      }, 1000)
    }
    if (pct >= 100 && !completedRef.current) {
      completedRef.current = true
      markDocCompleted()
    }
  }, [doc])

  // ── Panel management ────────────────────────────────

  const togglePanel = (panel) => {
    setActivePanel(prev => prev === panel ? null : panel)
    setSettingsOpen(false)
  }

  // Tap content → toggle all chrome (topbar + bottom bar)
  const handleTapContent = (e) => {
    if (e.target.closest('.reader-panel') || e.target.closest('.reader-bottom')) return
    setShowBars(v => !v)
  }

  // ── Text selection → highlight ──────────────────────

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1500)
  }, [])

  const getSelection = useCallback(() => {
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (text && text.length > 0) {
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelection({ text, rect })
    } else {
      setSelection(null)
    }
  }, [])

  const handleMouseUp = useCallback(() => setTimeout(getSelection, 10), [getSelection])
  const handleTouchEnd = useCallback(() => setTimeout(getSelection, 50), [getSelection])

  const handleSaveHighlight = () => {
    if (!selection || !doc) return
    const container = scrollRef.current?.querySelector('.card-content')
    const rendered = container?.textContent || scrollRef.current?.textContent || doc.content || ''
    const idx = rendered.toLowerCase().indexOf(selection.text.toLowerCase())
    const start = Math.max(0, idx - 60)
    const end = Math.min(rendered.length, idx + selection.text.length + 60)
    const snippet = (start > 0 ? '...' : '') + rendered.slice(start, end) + (end < rendered.length ? '...' : '')

    // Compute textOffset from the selection range within the content container
    let textOffset = -1
    let hlLength = selection.text.length
    try {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && container) {
        const range = sel.getRangeAt(0)
        const preRange = document.createRange()
        preRange.selectNodeContents(container)
        preRange.setEnd(range.startContainer, range.startOffset)
        textOffset = preRange.toString().length
        hlLength = range.toString().length
      }
    } catch {}

    addHighlight(doc.id, selection.text, snippet, textOffset, hlLength)
    setHighlights(getHighlightsByDoc(doc.id))
    setSelection(null)
    window.getSelection()?.removeAllRanges()
    setActivePanel('highlights')
    showToast('已保存高亮')
  }

  // ── Handlers ────────────────────────────────────────

  const handleJumpToHeading = (headingId) => {
    document.getElementById(headingId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActivePanel(null)
  }

  const handleJumpToBookmark = (bm) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({
      top: (bm.scrollPct / 100) * (scrollRef.current.scrollHeight - scrollRef.current.clientHeight),
      behavior: 'smooth',
    })
    setActivePanel(null)
  }

  const handleDeleteHighlight = (hId) => {
    deleteHighlight(hId)
    setHighlights(getHighlightsByDoc(doc.id))
    // Remove painted marks from DOM
    const container = scrollRef.current?.querySelector('.card-content')
    if (container) {
      const marks = container.querySelectorAll(`mark[data-hl-id="${hId}"]`)
      for (const mark of marks) {
        const parent = mark.parentNode
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
        parent.removeChild(mark)
      }
    }
  }
  const handleDeleteBookmark = (bId) => { deleteBookmark(bId); setBookmarks(getBookmarksByDoc(doc.id)) }
  const handleAddBookmark = () => { if (!doc) return; addBookmark(doc.id, scrollPct); setBookmarks(getBookmarksByDoc(doc.id)); showToast('已添加书签') }
  const handleUpdateSettings = (f) => { setSettings(updateReadingSettings(f)) }

  const handleExportHighlights = () => {
    if (!doc || !highlights.length) return
    const md = exportHighlightsMd(doc, highlights, html)
    const blob = new Blob([md], { type: 'text/markdown' })
    downloadBlob(blob, `${doc.title || 'highlights'}-highlights.md`)
    showToast('已导出高亮')
  }

  const handleGenerateFlashcards = () => {
    if (!doc || !highlights.length) return
    const cards = highlights.map(h => {
      let front, back
      if (h.note) {
        front = h.note
        back = h.selectedText
      } else {
        front = h.selectedText
        back = h.contextSnippet || ''
      }
      back += `\n\n——《${doc.title}》`
      return { front, back, type: 'recall', chapter: doc.title || '', section: '' }
    })
    navigate('/import', { state: { prefillCards: cards, prefillDeckName: `阅读 · ${doc.title}` } })
  }

  if (!doc) return null

  const barHidden = !showBars

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)', maxWidth: 'none' }}>
      {/* Top progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--bg-raised)', zIndex: 10 }}>
        <div style={{ height: '100%', background: 'var(--accent)', width: `${scrollPct}%`, transition: 'width 150ms' }} />
      </div>

      <ReaderToolbar title={doc.title} showBars={showBars} onBack={goBack} />

      {/* Panels */}
      <div className={`reader-panel ${activePanel === 'toc' ? 'open' : ''}`}>
        <TocPanel toc={toc} onJump={handleJumpToHeading} />
      </div>
      <div className={`reader-panel ${activePanel === 'highlights' ? 'open' : ''}`}>
        <HighlightsPanel highlights={highlights} onDelete={handleDeleteHighlight} />
      </div>
      <div className={`reader-panel ${activePanel === 'bookmarks' ? 'open' : ''}`}>
        <BookmarksPanel
          bookmarks={bookmarks}
          onJump={handleJumpToBookmark}
          onDelete={handleDeleteBookmark}
          onAddBookmark={handleAddBookmark}
          onExportHighlights={highlights.length > 0 ? handleExportHighlights : null}
          onGenerateFlashcards={highlights.length > 0 ? handleGenerateFlashcards : null}
        />
      </div>

      {/* Backdrop to close panels */}
      <div
        className={`reader-backdrop ${activePanel ? 'visible' : ''}`}
        style={{ position: 'fixed', inset: 0, zIndex: 14, background: 'rgba(0,0,0,0.15)' }}
        onClick={() => setActivePanel(null)}
      />

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto"
        onClick={handleTapContent} onScroll={handleScroll}
        onMouseUp={handleMouseUp} onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: barHidden ? 'max(20px, env(safe-area-inset-bottom))' : 'max(100px, env(safe-area-inset-bottom))' }}>
        {html ? (
          <div className="card-content" style={{
            maxWidth: 680, margin: '0 auto', padding: settings.margins,
            fontSize: settings.fontSize, lineHeight: settings.lineHeight,
          }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="flex items-center justify-center h-full text-ink-3 font-zh text-sm tracking-[0.04em]">
            加载中...
          </div>
        )}
      </div>

      {/* Floating highlight save button */}
      {selection && (
        <button
          onClick={handleSaveHighlight}
          className="fixed z-50 px-3.5 py-1.5 rounded-md font-zh text-[13px] font-medium shadow-lg"
          style={{
            background: 'var(--ink)', color: 'var(--bg)',
            border: '1px solid var(--border-strong)',
            left: Math.max(8, Math.min(selection.rect.left, window.innerWidth - 130)),
            top: Math.min(selection.rect.bottom + 8, window.innerHeight - 60),
            animation: 'fadeIn 150ms ease-out',
          }}>
          保存高亮
        </button>
      )}

      {/* Bottom bar — toggles with topbar */}
      <div className="reader-bottom" style={{
        flexShrink: 0,
        transition: 'opacity 200ms, transform 200ms',
        opacity: barHidden ? 0 : 1,
        transform: barHidden ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: barHidden ? 'none' : 'auto',
      }}>
        {/* Settings expansion */}
        {settingsOpen && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
            padding: '8px 18px',
            background: 'var(--bg)', borderTop: '1px solid var(--border-soft)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="font-mono text-[9px] text-ink-3 w-5 text-right">{settings.fontSize}</span>
              <button onClick={() => handleUpdateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>A-</button>
              <button onClick={() => handleUpdateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>A+</button>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border-soft)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="font-mono text-[9px] text-ink-3 w-5 text-right">{settings.lineHeight.toFixed(1)}</span>
              <button onClick={() => handleUpdateSettings({ lineHeight: Math.max(1.4, +(settings.lineHeight - 0.1).toFixed(1)) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>-</button>
              <button onClick={() => handleUpdateSettings({ lineHeight: Math.min(2.2, +(settings.lineHeight + 0.1).toFixed(1)) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>+</button>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border-soft)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="font-mono text-[9px] text-ink-3 w-5 text-right">{settings.margins}</span>
              <button onClick={() => handleUpdateSettings({ margins: Math.max(12, settings.margins - 4) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>-</button>
              <button onClick={() => handleUpdateSettings({ margins: Math.min(40, settings.margins + 4) })}
                className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink text-xs border"
                style={{ borderColor: 'var(--border)' }}>+</button>
            </div>
          </div>
        )}

        {/* Function bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
          padding: `10px 18px max(10px, env(safe-area-inset-bottom))`,
          background: 'var(--bg)', borderTop: '1px solid var(--border-soft)',
        }}>
          {BOTTOM_BTNS.map(b => (
            <button key={b.key}
              onClick={() => togglePanel(b.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors"
              style={{ color: activePanel === b.key ? 'var(--accent)' : 'var(--ink-3)' }}>
              <span className="font-zh text-[13px]">{b.label}</span>
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: 'var(--border-soft)' }} />
          <button onClick={() => { setSettingsOpen(v => !v); setActivePanel(null) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors"
            style={{ color: settingsOpen ? 'var(--accent)' : 'var(--ink-3)' }}>
            <span className="font-zh text-[13px]">设置</span>
          </button>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'var(--bg-raised)', transition: 'opacity 200ms',
        opacity: barHidden ? 0 : 1, zIndex: 5,
      }}>
        <div style={{ height: '100%', background: 'var(--accent)', width: `${scrollPct}%`, transition: 'width 200ms' }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '8px 16px', borderRadius: 999, fontSize: 12,
          fontFamily: 'var(--font-zh)', boxShadow: 'var(--shadow-md)', zIndex: 50,
          animation: 'fadeIn 150ms ease-out',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
