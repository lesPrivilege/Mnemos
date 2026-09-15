// Reader — immersive reading with auto-hide chrome
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getDocument, getDocumentContent, updateReadingProgress, getReadingSettings, updateReadingSettings } from '../lib/storage'
import { useBackButton } from '../../lib/useBackButton'
import NotFoundPage from '../../components/NotFoundPage'
import { renderDoc, extractToc } from '../lib/renderDoc'
import { getHighlightsByDoc, addHighlight, deleteHighlight, updateHighlight } from '../lib/highlights'
import { repaintHighlights } from '../lib/highlightAnchor'
import { getBookmarksByDoc, addBookmark, deleteBookmark } from '../lib/bookmarks'
import { startSession, endSession, markDocCompleted, touchSession } from '../lib/stats'
import { exportHighlightsMd } from '../lib/exportHighlights'
import { downloadBlob } from '../../lib/utils'
import { captureTextSelection, fingerprintText } from '../lib/sourceAnchor'
import { getDecks, addSourcedCardConfirmed } from '../../lib/storage'
import CardDraftEditor from '../../components/CardDraftEditor'
import ContextDialog from '../../components/ContextDialog'
import SelectionActions from '../components/SelectionActions'
import ReaderToolbar from '../components/ReaderToolbar'
import { TocPanel, HighlightsPanel, BookmarksPanel } from '../components/ReaderPanels'
import { S } from '../../lib/strings'
import '../../styles/markdown.css'
import '../styles/reader.css'

const BOTTOM_BTNS = [
  { key: 'toc',        label: S.reader.tocTab },
  { key: 'highlights', label: S.reader.highlightsTab },
  { key: 'bookmarks',  label: S.reader.bookmarksTab },
]

const READING_LIMITS = {
  fontSize: { min: 14, max: 24 },
  lineHeight: { min: 1.4, max: 2.2 },
  margins: { min: 12, max: 40 },
}

export default function Reader() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const [doc, setDoc] = useState(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState(false)
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
  const [draft, setDraft] = useState(null)
  const [savingCard, setSavingCard] = useState(false)
  const [savedCard, setSavedCard] = useState(null)
  const scrollRef = useRef(null)
  const toastTimer = useRef(null)
  const persistTimer = useRef(null)
  const pendingPct = useRef(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (showBars) return
    const active = document.activeElement
    if (active?.closest('.topbar, .reader-bottom')) {
      scrollRef.current?.focus({ preventScroll: true })
    }
  }, [showBars])

  // ── Load document + session ─────────────────────────

  const loadContent = (d) => {
    setLoadError(false)
    getDocumentContent(id)
      .then(content => renderDoc(content, d.format).then(h => { setHtml(h); setToc(extractToc(h)) }))
      .catch(() => setLoadError(true))
  }

  useEffect(() => {
    // 换文档先复位断链态——否则由不存在之文档转入存在者，仍滞留「未找到」
    setMissing(false)
    const d = getDocument(id)
    // 断链不静默：不见页有返回径，不再无声 goBack（病2 修）
    if (!d) { setMissing(true); return }
    setDoc(d)
    loadContent(d)
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
    if (window.getSelection()?.toString()) return
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
    const container = scrollRef.current?.querySelector('.card-content')
    setSelection(captureTextSelection(container))
  }, [])
  useEffect(() => {
    document.addEventListener('selectionchange', getSelection)
    return () => document.removeEventListener('selectionchange', getSelection)
  }, [getSelection])
  const handleMouseUp = getSelection
  const handleTouchEnd = getSelection

  const saveSelectedExcerpt = () => {
    if (!selection || !doc) return null
    const snapshot = selection
    const snippet = `${snapshot.contextBefore}${snapshot.selectedText}${snapshot.contextAfter}`
    const highlight = addHighlight(doc.id, snapshot.selectedText, snippet, snapshot.textOffset, snapshot.length, snapshot)
    setHighlights(getHighlightsByDoc(doc.id))
    setSelection(null)
    window.getSelection()?.removeAllRanges()
    showToast(S.reader.savedHighlightToast)
    return highlight
  }
  const handleSaveHighlight = () => {
    try { saveSelectedExcerpt() } catch (error) { showToast(error.message) }
  }
  const openDraft = async highlight => {
    if (!highlight || !doc) return
    const text = scrollRef.current?.querySelector('.card-content')?.textContent || ''
    if (text.slice(highlight.textOffset, highlight.textOffset + highlight.length) !== highlight.selectedText) {
      showToast('原文已变化，请重新选择这段摘句。'); return
    }
    const contentFingerprint = await fingerprintText(text)
    setActivePanel(null)
    setSelection(null)
    const decks = getDecks()
    setDraft({ id: crypto.randomUUID(), front: highlight.note || '', back: highlight.selectedText,
      deckId: decks[0]?.id || '', deckName: doc.title || '阅读摘录', chapter: doc.title,
      source: { version: 1, kind: 'document', id: doc.id, highlightId: highlight.id,
        quote: highlight.selectedText, textOffset: highlight.textOffset, length: highlight.length,
        contextBefore: highlight.contextBefore || '', contextAfter: highlight.contextAfter || '', contentFingerprint } })
  }
  const handleCreateSelection = async () => {
    try { await openDraft(saveSelectedExcerpt()) } catch (error) { showToast(error.message) }
  }
  const handleNote = (highlightId, note) => {
    updateHighlight(highlightId, { note })
    setHighlights(getHighlightsByDoc(doc.id))
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
  const handleAddBookmark = () => { if (!doc) return; addBookmark(doc.id, scrollPct); setBookmarks(getBookmarksByDoc(doc.id)); showToast(S.reader.addedBookmarkToast) }
  const handleUpdateSettings = (f) => { setSettings(updateReadingSettings(f)) }

  const handleExportHighlights = () => {
    if (!doc || !highlights.length) return
    const md = exportHighlightsMd(doc, highlights, html)
    const blob = new Blob([md], { type: 'text/markdown' })
    downloadBlob(blob, `${doc.title || 'highlights'}-highlights.md`)
    showToast(S.reader.exportedHighlightsToast)
  }

  const handleGenerateFlashcards = async () => {
    if (!doc || !highlights.length) return
    const text = scrollRef.current?.querySelector('.card-content')?.textContent || ''
    const contentFingerprint = await fingerprintText(text)
    const cards = highlights.map(h => {
      let front, back
      if (h.note) {
        front = h.note
        back = h.selectedText
      } else {
        front = h.selectedText
        back = h.contextSnippet || ''
      }
      back += S.reader.flashcardSourceAttribution(doc.title)
      const source = h.textOffset >= 0 && text.slice(h.textOffset, h.textOffset + h.length) === h.selectedText
        ? { version: 1, kind: 'document', id: doc.id, highlightId: h.id, quote: h.selectedText, textOffset: h.textOffset, length: h.length, contentFingerprint, contextBefore: h.contextBefore || '', contextAfter: h.contextAfter || '' } : null
      return { id: crypto.randomUUID(), front, back, type: 'recall', chapter: doc.title || '', section: '', ...(source ? { source } : {}) }
    })
    navigate('/import?tab=md', { state: { prefillCards: cards, prefillDeckName: `${S.reader.flashcardDeckNamePrefix}${doc.title}` } })
  }

  if (missing) return <NotFoundPage title={S.reader.notFound} />
  if (loadError && doc) {
    return (
      <NotFoundPage
        title={S.reader.loadErrorTitle}
        hint={S.reader.loadErrorHint}
        action={{ label: S.reader.retryAction, onClick: () => loadContent(doc) }}
      />
    )
  }
  if (!doc) return null

  const barHidden = !showBars

  return (
    <div className="page-fixed" style={{ background: 'var(--bg)', maxWidth: 'none' }}>
      {/* Top progress bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--bg-raised)', zIndex: 10 }}>
        <div style={{ width: '100%', height: '100%', background: 'var(--accent)', transformOrigin: 'left', transform: `scaleX(${scrollPct / 100})`, transition: 'transform var(--motion-gentle)' }} />
      </div>

      <ReaderToolbar title={doc.title} showBars={showBars} onBack={goBack} />

      <ContextDialog open={Boolean(activePanel)} title={BOTTOM_BTNS.find(button => button.key === activePanel)?.label || ''} onClose={() => setActivePanel(null)}>
        {activePanel === 'toc' && <TocPanel toc={toc} onJump={handleJumpToHeading} />}
        {activePanel === 'highlights' && <HighlightsPanel highlights={highlights} onDelete={handleDeleteHighlight} onNote={handleNote} onCreate={openDraft} />}
        {activePanel === 'bookmarks' && <BookmarksPanel bookmarks={bookmarks} onJump={handleJumpToBookmark} onDelete={handleDeleteBookmark} onAddBookmark={handleAddBookmark} onExportHighlights={highlights.length > 0 ? handleExportHighlights : null} onGenerateFlashcards={highlights.length > 0 ? handleGenerateFlashcards : null} />}
      </ContextDialog>

      {/* Content */}
      <div ref={scrollRef} tabIndex={-1} className="flex-1 overflow-y-auto"
        onClick={handleTapContent} onScroll={() => { setSelection(null); handleScroll() }}
        onMouseUp={handleMouseUp} onTouchEnd={handleTouchEnd}
        style={{ paddingBottom: barHidden ? 'max(20px, env(safe-area-inset-bottom))' : 'max(100px, env(safe-area-inset-bottom))' }}>
        {html ? (
          <div className="card-content" style={{
            maxWidth: 680, margin: '0 auto', padding: settings.margins,
            fontSize: settings.fontSize, lineHeight: settings.lineHeight,
          }} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div className="flex items-center justify-center h-full text-ink-3 font-zh text-md tracking-[0.04em]">
            {S.reader.loading}
          </div>
        )}
      </div>

      <SelectionActions selection={draft ? null : selection} onExcerpt={handleSaveHighlight} onCreate={handleCreateSelection} onClose={() => setSelection(null)} />
      <ContextDialog open={Boolean(draft)} dismissible={!savingCard} title="制成卡片" onClose={() => setDraft(null)}>
        {draft && <CardDraftEditor key={draft.id} initialDraft={draft} decks={getDecks()} onSave={addSourcedCardConfirmed} onPendingChange={setSavingCard} onCancel={() => setDraft(null)} onSaved={card => { setSavedCard(card); setDraft(null) }} />}
      </ContextDialog>
      {savedCard && <div className="reader-receipt"><span role="status">卡片已保存</span><Link to={`/browse/${savedCard.deckId}?card=${savedCard.id}`} state={{ returnTo: `/reading/doc/${doc.id}` }}>查看卡片</Link><button onClick={() => setSavedCard(null)}>收起</button></div>}

      {/* Bottom bar — toggles with topbar */}
      <div className="reader-bottom" inert={barHidden ? '' : undefined} aria-hidden={barHidden} style={{
        flexShrink: 0,
        transition: 'opacity var(--motion-mid), transform var(--motion-mid)',
        opacity: barHidden ? 0 : 1,
        transform: barHidden ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: barHidden ? 'none' : 'auto',
      }}>
        {/* Settings expansion */}
        {settingsOpen && (
          <div className="reader-settings">
            <div className="reader-setting-group" role="group" aria-label={S.reader.fontSizeSetting}>
              <div className="reader-setting-label"><span>{S.reader.fontSizeSetting}</span><span className="font-mono" aria-live="polite">{settings.fontSize}</span></div>
              <div className="reader-setting-actions">
                <button onClick={() => handleUpdateSettings({ fontSize: Math.max(READING_LIMITS.fontSize.min, settings.fontSize - 1) })}
                  className="reader-stepper" aria-label={S.reader.decreaseFontSize} disabled={settings.fontSize <= READING_LIMITS.fontSize.min}>A−</button>
                <button onClick={() => handleUpdateSettings({ fontSize: Math.min(READING_LIMITS.fontSize.max, settings.fontSize + 1) })}
                  className="reader-stepper" aria-label={S.reader.increaseFontSize} disabled={settings.fontSize >= READING_LIMITS.fontSize.max}>A+</button>
              </div>
            </div>
            <div className="reader-setting-group" role="group" aria-label={S.reader.lineHeightSetting}>
              <div className="reader-setting-label"><span>{S.reader.lineHeightSetting}</span><span className="font-mono" aria-live="polite">{settings.lineHeight.toFixed(1)}</span></div>
              <div className="reader-setting-actions">
                <button onClick={() => handleUpdateSettings({ lineHeight: Math.max(READING_LIMITS.lineHeight.min, +(settings.lineHeight - 0.1).toFixed(1)) })}
                  className="reader-stepper" aria-label={S.reader.decreaseLineHeight} disabled={settings.lineHeight <= READING_LIMITS.lineHeight.min}>−</button>
                <button onClick={() => handleUpdateSettings({ lineHeight: Math.min(READING_LIMITS.lineHeight.max, +(settings.lineHeight + 0.1).toFixed(1)) })}
                  className="reader-stepper" aria-label={S.reader.increaseLineHeight} disabled={settings.lineHeight >= READING_LIMITS.lineHeight.max}>+</button>
              </div>
            </div>
            <div className="reader-setting-group" role="group" aria-label={S.reader.marginsSetting}>
              <div className="reader-setting-label"><span>{S.reader.marginsSetting}</span><span className="font-mono" aria-live="polite">{settings.margins}</span></div>
              <div className="reader-setting-actions">
                <button onClick={() => handleUpdateSettings({ margins: Math.max(READING_LIMITS.margins.min, settings.margins - 4) })}
                  className="reader-stepper" aria-label={S.reader.decreaseMargins} disabled={settings.margins <= READING_LIMITS.margins.min}>−</button>
                <button onClick={() => handleUpdateSettings({ margins: Math.min(READING_LIMITS.margins.max, settings.margins + 4) })}
                  className="reader-stepper" aria-label={S.reader.increaseMargins} disabled={settings.margins >= READING_LIMITS.margins.max}>+</button>
              </div>
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
              <span className="font-body text-md">{b.label}</span>
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: 'var(--border-soft)' }} />
          <button onClick={() => { setSettingsOpen(v => !v); setActivePanel(null) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors"
            style={{ color: settingsOpen ? 'var(--accent)' : 'var(--ink-3)' }}>
            <span className="font-body text-md">{S.reader.settings}</span>
          </button>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'var(--bg-raised)', transition: 'opacity var(--motion-mid)',
        opacity: barHidden ? 0 : 1, zIndex: 5,
      }}>
        <div style={{ width: '100%', height: '100%', background: 'var(--accent)', transformOrigin: 'left', transform: `scaleX(${scrollPct / 100})`, transition: 'transform var(--motion-gentle)' }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--bg)',
          padding: '8px 16px', borderRadius: 999, fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-zh)', boxShadow: 'var(--shadow-md)', zIndex: 50,
          animation: 'fadeIn var(--motion-mid)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
