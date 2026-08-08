import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import CardEditor from '../components/CardEditor'
import { BackIcon, PinIcon, MoreIcon, LayersIcon, SparkIcon, UploadIcon, PlusIcon, SearchIcon, EditIcon, TrashIcon, DownloadIcon, RefreshIcon, AlertIcon } from '../components/Icons'
import FloatingBar from '../components/FloatingBar'
import NotFoundPage from '../components/NotFoundPage'
import { isRecall } from '../lib/cardUtils'
import { mastery, masteryTier, tierCounts } from '../lib/cardStats'
import StructureTree from '../components/StructureTree'
import { localToday } from '../lib/dateUtils'
import { getDeck, getCards, addCard, updateCard, updateDeck, deleteCard, deleteCards, deleteDeck, togglePin, exportDeck, resetDeckProgress } from '../lib/storage'
import { useBackButton } from '../lib/useBackButton'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { downloadBlob } from '../lib/utils'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'
import { pressable } from '../lib/a11y'
import '../styles/markdown.css'

/* 熟练度四档之序：由稳至新，墨由深至浅——序即墨阶，不另编色（记-31）。
   「弱」是唯一需人动手的一档，故独得一个图标作非色线索。 */
const TIER_ROWS = [
  { key: 'solid', label: S.deckDetail.solidTier, ink: 'var(--ink)' },
  { key: 'mid', label: S.deckDetail.midTier, ink: 'var(--ink-2)' },
  { key: 'weak', label: S.deckDetail.weakTier, ink: 'var(--ink-3)', alert: true },
  { key: 'new', label: S.deckDetail.newTier, ink: 'var(--ink-4)' },
]

const pct = (n, total) => (total > 0 ? (n / total) * 100 : 0)

function TierRow({ row, count, total }) {
  return (
    <div className="dd-tier-row">
      <span className="k">
        {row.alert && count > 0 && <AlertIcon size={10} />}
        {row.label}
      </span>
      <span className="bar" style={{ width: `${pct(count, total)}%`, background: row.ink }} />
      <span className="v">{count}</span>
    </div>
  )
}

function buildOutline(cards) {
  const map = new Map()
  for (const card of cards) {
    const ch = card.chapter || ''
    if (!map.has(ch)) map.set(ch, new Map())
    const secMap = map.get(ch)
    const sec = card.section || ''
    if (!secMap.has(sec)) secMap.set(sec, [])
    secMap.get(sec).push(card)
  }
  return map
}

export default function DeckDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { toast } = useToast()
  const { confirmState, confirm } = useConfirm()
  const [deck, setDeck] = useState(null)
  const [cards, setCards] = useState([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [expandedChapters, setExpandedChapters] = useState(new Set())
  const [expandedSections, setExpandedSections] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showDeckMenu, setShowDeckMenu] = useState(false)
  const [previewCard, setPreviewCard] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' | 'tree'

  const refresh = () => {
    setDeck(getDeck(id))
    setCards(getCards(id))
  }

  useEffect(refresh, [id])

  const filteredCards = useMemo(() => {
    if (filter === 'starred') return cards.filter(c => c.starred)
    return cards
  }, [cards, filter])

  const outline = useMemo(() => buildOutline(filteredCards), [filteredCards])

  const toggleChapter = (ch) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev)
      if (next.has(ch)) next.delete(ch)
      else next.add(ch)
      return next
    })
  }

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAdd = (front, back) => {
    addCard(id, front, back)
    setShowEditor(false)
    refresh()
  }

  const handleEdit = (front, back) => {
    updateCard(editingCard.id, { front, back })
    setEditingCard(null)
    refresh()
  }

  const handleDelete = (cardId) => {
    deleteCard(cardId)
    refresh()
  }

  const handleResetProgress = async () => {
    const ok = await confirm({ title: S.deckDetail.resetProgressTitle, message: S.deckDetail.resetProgressMessage(deck.name), confirmLabel: S.deckDetail.confirmReset, destructive: false })
    if (!ok) return
    resetDeckProgress(id)
    refresh()
  }

  const handleDeleteDeck = async () => {
    const ok = await confirm({ title: S.deckDetail.deleteDeckTitle, message: S.deckDetail.deleteDeckMessage, confirmLabel: S.deckDetail.confirmDelete })
    if (!ok) return
    deleteDeck(id)
    navigate('/?tab=flashcard')
  }

  const toggleSelect = (cardId) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (selected.size === 0) return
    const ok = await confirm({ title: S.deckDetail.batchDeleteTitle, message: S.deckDetail.batchDeleteMessage(selected.size), confirmLabel: S.deckDetail.confirmDelete })
    if (!ok) return
    deleteCards([...selected])
    setSelected(new Set())
    setEditing(false)
    refresh()
  }

  const exitEdit = () => {
    setEditing(false)
    setSelected(new Set())
  }

  const recallCards = cards.filter(c => isRecall(c))
  const activeCards = recallCards.filter(c => !c.suspended)
  const suspendedCount = recallCards.filter(c => c.suspended).length
  const tiers = tierCounts(cards)
  const t = localToday()
  const dueCount = activeCards.filter(c => c.dueDate <= t).length
  const total = recallCards.length
  const learned = activeCards.length - dueCount

  // Build tree nodes for structure view
  const treeNodes = (() => {
    const chapterMap = new Map()
    for (const card of filteredCards) {
      const ch = card.chapter || S.deckDetail.uncategorized
      if (!chapterMap.has(ch)) chapterMap.set(ch, new Map())
      const secMap = chapterMap.get(ch)
      const sec = card.section || ''
      if (!secMap.has(sec)) secMap.set(sec, [])
      secMap.get(sec).push(card)
    }
    return [...chapterMap.entries()].map(([ch, secMap]) => {
      const chCards = [...secMap.values()].flat()
      const chTiers = tierCounts(chCards)
      const children = [...secMap.entries()]
        .filter(([sec]) => sec !== '')
        .map(([sec, secCards]) => ({
          id: `${ch}::${sec}`,
          label: sec,
          count: secCards.length,
          tiers: tierCounts(secCards),
          chapter: ch,
          section: sec,
        }))
      // Cards with empty section hang directly under chapter
      const noSecCards = secMap.get('') || []
      if (noSecCards.length > 0 && children.length === 0) {
        // Chapter has only unsectioned cards — it IS the leaf
        return { id: ch, label: ch, count: chCards.length, tiers: chTiers, chapter: ch, section: '' }
      }
      if (noSecCards.length > 0) {
        children.unshift({ id: `${ch}::`, label: S.deckDetail.uncategorized, count: noSecCards.length, tiers: tierCounts(noSecCards), chapter: ch, section: '' })
      }
      return { id: ch, label: ch, count: chCards.length, tiers: chTiers, children }
    })
  })()

  if (!deck) {
    return <NotFoundPage title={S.deckDetail.notFound} hint={S.deckDetail.notFoundHint} />
  }

  return (
      <div className="page-fill">
      {/* Header */}
      <header className="topbar">
        <button onClick={goBack} className="tb-btn">
          <BackIcon />
        </button>
        {editingName ? (
          <input autoFocus type="text" value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              const trimmed = nameInput.trim()
              if (trimmed && trimmed !== deck.name) { updateDeck(id, trimmed) }
              setEditingName(false)
              refresh()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.target.blur()
              else if (e.key === 'Escape') { setEditingName(false) }
            }}
            className="flex-1 font-zh text-xl font-medium text-ink bg-transparent border-b border-accent outline-none px-2" />
        ) : (
          <h1 onClick={() => { setEditingName(true); setNameInput(deck.name) }}
            className="flex-1 font-zh text-xl font-medium text-ink truncate cursor-pointer hover:text-accent transition-colors pl-1">
            {deck.name}
          </h1>
        )}
        <div className="tb-actions">
          <div className="relative">
            <button onClick={() => setShowDeckMenu((open) => !open)}
              className="tb-btn" aria-haspopup="menu" aria-expanded={showDeckMenu}>
              <MoreIcon />
            </button>
            {showDeckMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowDeckMenu(false)} aria-label={S.deckDetail.closeMenu} />
                <div className="absolute right-0 top-9 z-20 min-w-[168px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={() => { setShowDeckMenu(false); setEditingName(true); setNameInput(deck.name) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <EditIcon size={15} /> {S.deckDetail.rename}
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); togglePin(id); refresh() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <PinIcon size={15} /> {deck.pinned ? S.deckDetail.unpinDeck : S.deckDetail.pinDeck}
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); editing ? exitEdit() : setEditing(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <EditIcon size={15} /> {editing ? S.deckDetail.finishEditing : S.deckDetail.batchEditCards}
                  </button>
                  <button onClick={() => {
                    setShowDeckMenu(false)
                    const json = exportDeck(id)
                    if (!json) return
                    const blob = new Blob([json], { type: 'application/json' })
                    downloadBlob(blob, `${deck.name || 'deck'}.json`)
                  }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <DownloadIcon size={15} /> {S.deckDetail.exportDeck}
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); handleResetProgress() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <RefreshIcon size={15} /> {S.deckDetail.resetProgressMenu}
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); handleDeleteDeck() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> {S.deckDetail.deleteDeckMenu}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 140 }}>
        {/* 熟练度分布（记-31）
            旧此处并列四件同源之物：一行「总数·待复习·已学·暂停」、一行
            四档计数、一条 learned/total 进度条、一行「进度 N%」——同一个
            分布说了四遍，而主行动之数（待复习）在浮动条上已有。今收为一张
            带标签之表：一行一档，标签在左、条在中、数在右，色不单独编码
            （唯「弱」加图标，它是唯一需人动手的一档）。 */}
        <div className="dd-tiers">
          <div className="dd-tiers-head">
            <span className="t">{S.deckDetail.distributionLabel}</span>
            <span className="m">{S.deckDetail.totalSummary(total, learned)}</span>
          </div>
          {TIER_ROWS.map((row) => (
            <TierRow key={row.key} row={row} count={tiers[row.key]} total={total} />
          ))}
          {suspendedCount > 0 && (
            <div className="dd-tier-row paused">
              <span className="k">{S.deckDetail.pausedTier}</span>
              <span className="bar" style={{ width: `${pct(suspendedCount, total)}%` }} />
              <span className="v">{suspendedCount}</span>
            </div>
          )}
        </div>

        {/* Editor */}
        {showEditor && (
          <div className="mx-[18px] mt-2 p-4 rounded-md border bg-bg-card" style={{ borderColor: 'var(--border-soft)' }}>
            <CardEditor onSave={handleAdd} onCancel={() => setShowEditor(false)} />
          </div>
        )}

        {/* Filter chips */}
        <div style={{ padding: '10px 0 0' }}>
          <div className="filters">
            <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'on' : ''}`}>
              {S.deckDetail.allFilterPrefix}{total}
            </button>
            <button onClick={() => setFilter('starred')} className={`chip ${filter === 'starred' ? 'on' : ''}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
              {S.deckDetail.starredFilter}
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ padding: '6px 18px' }}>
          <div className="seg" style={{ maxWidth: 160 }}>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'on' : ''}>{S.deckDetail.listView}</button>
            <button onClick={() => setViewMode('tree')} className={viewMode === 'tree' ? 'on' : ''}>{S.deckDetail.treeView}</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 0 0' }}>
          <div className="search" style={{ margin: '0 18px' }}>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={S.deckDetail.searchPlaceholder} />
            <SearchIcon size={16} />
          </div>
        </div>

        {/* Card list / outline */}
        <div style={{ padding: '8px 0 24px' }}>
          {cards.length === 0 ? (
            <div className="empty" style={{ margin: '0 18px' }}>
              <div className="msg">{S.deckDetail.emptyCardsTitle}</div>
              <div className="motto-zh">{S.deckDetail.emptyCardsHint}</div>
            </div>
          ) : viewMode === 'tree' ? (
            <div className="mx-[18px]">
              <StructureTree
                nodes={treeNodes}
                onLeafTap={(node) => navigate(`/browse/${id}?chapter=${encodeURIComponent(node.chapter)}${node.section ? `&section=${encodeURIComponent(node.section)}` : ''}`)}
              />
            </div>
          ) : searchQuery.trim() ? (
            <div className="card-list">
              {filteredCards
                .filter(c => {
                  const q = searchQuery.toLowerCase()
                  return c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
                })
                .map(card => (
                    <div key={card.id} className="card-row">
                      <span className="dot-bullet" />
                      <span className="front">{card.front}</span>
                      {card.starred && <span className="star">★</span>}
                      {!isRecall(card) && <span className="q-tag-mini">REF</span>}
                    </div>
                ))}
            </div>
          ) : (
            <div className="mx-[18px] flex flex-col gap-px">
              {[...outline.entries()].map(([chapter, secMap]) => {
                const chapterKey = chapter || '__uncategorized__'
                const chapterCount = [...secMap.values()].reduce((sum, arr) => sum + arr.length, 0)
                const isChapterOpen = expandedChapters.has(chapterKey)

                return (
                  <div key={chapterKey}>
                    <div onClick={() => toggleChapter(chapterKey)}
                      className="ch-row" aria-expanded={isChapterOpen}
                      {...pressable(() => toggleChapter(chapterKey))}>
                      <span className={`ch-caret ${isChapterOpen ? 'open' : ''}`}>›</span>
                      <span className="ch-name">{chapter || S.deckDetail.uncategorized}</span>
                      <span className="ch-count">{chapterCount}</span>
                    </div>
                    {isChapterOpen && (
                      <div className="ml-5">
                        {[...secMap.entries()].map(([section, sectionCards]) => {
                          const sectionKey = `${chapterKey}::${section}`
                          const isSectionOpen = expandedSections.has(sectionKey)
                          if (!section) {
                            return (
                              <div key={sectionKey} className="ml-4">
                                {sectionCards.map((card) => (
                                  <CardRow key={card.id} card={card} editing={editing} selected={selected.has(card.id)}
                                    onToggleSelect={() => toggleSelect(card.id)}
                                    onEdit={() => setEditingCard(card)} onDelete={() => handleDelete(card.id)}
                                    isEditingThis={editingCard?.id === card.id} onSave={handleEdit} onCancel={() => setEditingCard(null)}
                                    onPreview={setPreviewCard} confirm={confirm} />
                                ))}
                              </div>
                            )
                          }
                          return (
                            <div key={sectionKey}>
                              <div onClick={() => toggleSection(sectionKey)}
                                className="sec-row" aria-expanded={isSectionOpen}
                                {...pressable(() => toggleSection(sectionKey))}>
                                <span className={`ch-caret ${isSectionOpen ? 'open' : ''}`}>›</span>
                                <span className="ch-name">{section}</span>
                                <span className="ch-count">{sectionCards.length}</span>
                              </div>
                              {isSectionOpen && (
                                <div className="ml-4">
                                  {sectionCards.map((card) => (
                                    <CardRow key={card.id} card={card} editing={editing} selected={selected.has(card.id)}
                                      onToggleSelect={() => toggleSelect(card.id)}
                                      onEdit={() => setEditingCard(card)} onDelete={() => handleDelete(card.id)}
                                      isEditingThis={editingCard?.id === card.id} onSave={handleEdit} onCancel={() => setEditingCard(null)}
                                      onPreview={setPreviewCard} confirm={confirm} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Edit mode batch delete */}
        {editing && (
          <div className="mx-[18px] mb-4 flex gap-2">
            {selected.size > 0 && (
              <button onClick={handleBatchDelete}
                className="flex-1 py-2.5 rounded-md font-body text-md text-critical border active:scale-[0.97] transition-transform"
                style={{ borderColor: 'color-mix(in oklch, var(--danger-critical) 30%, transparent)' }}>
                {S.deckDetail.batchDeleteLabel(selected.size)}
              </button>
            )}
            <button onClick={async () => {
              const ok = await confirm({ title: S.deckDetail.deleteAllTitle, message: S.deckDetail.deleteAllMessage(cards.length), confirmLabel: S.deckDetail.confirmDelete })
              if (!ok) return
              deleteCards(cards.map((c) => c.id))
              setSelected(new Set())
              setEditing(false)
              refresh()
            }}
              className="flex-1 py-2.5 rounded-md font-body text-md text-critical border active:scale-[0.97] transition-transform"
              style={{ borderColor: 'color-mix(in oklch, var(--danger-critical) 30%, transparent)' }}>
              {S.deckDetail.deleteAllButton}
            </button>
          </div>
        )}
      </main>

      {/* Floating action bar */}
      <FloatingBar>
        {/* Primary CTA */}
        <div className="dd-cta" style={{ margin: 0 }}>
          <Link to={`/review/${id}`} className="dd-cta-main">
            <div className="left">
              <span className="lead"><span className="num">{dueCount}</span>{S.deckDetail.dueLeadSuffix}</span>
              <span className="sub">{S.deckDetail.beginLabel}</span>
            </div>
            <span className="arr">→</span>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="dd-secondary" style={{ margin: 0 }}>
          <Link to={`/browse/${id}`} className="dd-action">
            <LayersIcon size={18} /><span className="lab">{S.deckDetail.browseAction}</span>
          </Link>
          <Link to={`/review/${id}?all=true`} className="dd-action">
            <SparkIcon size={18} /><span className="lab">{S.deckDetail.reviewAllAction}</span>
          </Link>
          <Link to={`/import?tab=md&deckId=${id}`} className="dd-action">
            <UploadIcon size={18} /><span className="lab">{S.deckDetail.importAction}</span>
          </Link>
          <button onClick={() => setShowEditor(!showEditor)} className="dd-action">
            <PlusIcon size={18} /><span className="lab">{S.deckDetail.newCardAction}</span>
          </button>
        </div>
      </FloatingBar>
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'var(--scrim)' }} onClick={() => setPreviewCard(null)}>
          <div className="bg-bg-card rounded-lg p-5 max-w-sm w-full border border-border-soft" style={{ border: '1px solid var(--border-soft)' }} onClick={e => e.stopPropagation()}>
            <div className="font-body text-2xs text-ink-3 mb-2 tracking-wider">{S.deckDetail.previewFrontLabel}</div>
            <div className="font-zh text-lg text-ink mb-3 max-h-40 overflow-y-auto"><PreviewContent text={previewCard.front} /></div>
            <div className="font-body text-2xs text-ink-3 mb-2 tracking-wider">{S.deckDetail.previewBackLabel}</div>
            <div className="font-zh text-lg card-content max-h-48 overflow-y-auto"><PreviewContent text={previewCard.back} /></div>
            <button onClick={() => setPreviewCard(null)} className="mt-4 w-full py-2 rounded-md text-md font-body text-ink-2 border" style={{ borderColor: 'var(--border)' }}>{S.deckDetail.close}</button>
          </div>
        </div>
      )}
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}

function PreviewContent({ text }) {
  const html = useRenderedMarkdown(text)
  return <div className="card-content" dangerouslySetInnerHTML={{ __html: html }} />
}

function CardRow({ card, editing, selected, onToggleSelect, onEdit, onDelete, isEditingThis, onSave, onCancel, onPreview, confirm }) {
  const longPressTimer = useRef(null)
  const tier = isRecall(card) ? masteryTier(mastery(card)) : null
  /* 熟练度点归墨阶（记-25）：mid 旧占 accent，违判例四（accent 不入语义场景）；
     新/中/稳成一道单调墨阶，唯「弱」留 danger——它是唯一要人动手的一档。 */
  const tierColor = card.repetitions === 0 ? 'var(--ink-4)' : tier === 'weak' ? 'var(--danger)' : tier === 'mid' ? 'var(--ink-3)' : 'var(--ink)'

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => onPreview?.(card), 500)
  }

  const handleTouchEnd = () => clearTimeout(longPressTimer.current)

  if (isEditingThis) {
    return (
      <div className="p-2 rounded-lg border border-accent bg-accent/5">
        <CardEditor initial={card} onSave={onSave} onCancel={onCancel} />
      </div>
    )
  }

  if (editing) {
    return (
      <div onClick={onToggleSelect} {...pressable(onToggleSelect)}
        className={`flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-colors
          ${selected ? 'bg-accent/5 border border-accent' : 'border hover:bg-bg-raised'}`}
        style={{ borderColor: selected ? undefined : 'var(--border)' }}>
        <div className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center
          ${selected ? 'bg-accent border-accent' : 'border-border'}`}>
          {selected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-md text-ink truncate flex-1">{card.front}</span>
        {card.starred && <span className="text-xs shrink-0 text-accent">★</span>}
        {!isRecall(card) && (
          <span className="font-body text-2xs px-1.5 py-0.5 rounded border text-ink-3 shrink-0" style={{ borderColor: 'var(--border)' }}>REF</span>
        )}
      </div>
    )
  }

  return (
      <div className="card-row group" style={{ paddingRight: 12 }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
        {...pressable(() => onPreview?.(card))}>
        <span className="dot-bullet" style={{ left: 8 }} />
        {isRecall(card) && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, flexShrink: 0, marginLeft: 2 }} />
        )}
        <span className="front" style={{ fontSize: 'var(--text-md)', paddingLeft: isRecall(card) ? 4 : 6 }}>{card.front}</span>
        {card.starred && <span className="star">★</span>}
        {!isRecall(card) && (
          <span className="q-tag-mini">REF</span>
        )}
        <div className="hidden group-hover:flex group-focus-within:flex gap-1 shrink-0 ml-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-xs px-1.5 py-0.5 rounded border text-ink-2" style={{ borderColor: 'var(--border)' }}>{S.deckDetail.editCard}</button>
          <button onClick={async (e) => { e.stopPropagation(); const ok = await confirm({ title: S.deckDetail.deleteCardTitle, message: S.deckDetail.deleteCardMessage, confirmLabel: S.deckDetail.confirmDelete }); if (ok) onDelete() }}
            className="text-xs px-1.5 py-0.5 rounded border text-critical" style={{ borderColor: 'color-mix(in oklch, var(--danger-critical) 30%, transparent)' }}>{S.deckDetail.deleteCard}</button>
        </div>
      </div>
  )
}
