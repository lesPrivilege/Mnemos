import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import CardEditor from '../components/CardEditor'
import { BackIcon, PinIcon, MoreIcon, LayersIcon, SparkIcon, UploadIcon, PlusIcon, EditIcon, TrashIcon, DownloadIcon, RefreshIcon, AlertIcon, StarIcon } from '../components/Icons'
import NotFoundPage from '../components/NotFoundPage'
import { isRecall } from '../lib/cardUtils'
import { mastery, masteryTier, tierCounts } from '../lib/cardStats'
import { localToday } from '../lib/dateUtils'
import { getDeck, getCards, addCard, updateCard, updateDeck, deleteCard, deleteCards, deleteDeck, togglePin, exportDeck, resetDeckProgress } from '../lib/storage'
import { useBackButton } from '../lib/useBackButton'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { downloadBlob } from '../lib/utils'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { FocusHeader } from '../components/FocusHeader'
import { lastReviewedAt } from '../lib/derive'
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

function reviewedAgo(ms) {
  if (ms == null) return S.deckDetail.neverReviewed
  const minutes = Math.floor((Date.now() - ms) / 60000)
  if (minutes < 1) return S.deckDetail.justReviewed
  if (minutes < 60) return S.deckDetail.minutesAgo(minutes)
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return S.deckDetail.hoursAgo(hours)
  return S.deckDetail.daysAgo(Math.floor(hours / 24))
}

export default function DeckDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const [deck, setDeck] = useState(null)
  const [cards, setCards] = useState([])
  const [showEditor, setShowEditor] = useState(false)
  const [editingCard, setEditingCard] = useState(null)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [filter, setFilter] = useState('all')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showDeckMenu, setShowDeckMenu] = useState(false)
  const [previewCard, setPreviewCard] = useState(null)

  const refresh = () => {
    setDeck(getDeck(id))
    setCards(getCards(id))
  }

  useEffect(refresh, [id])

  const filteredCards = useMemo(() => {
    const today = localToday()
    if (filter === 'due') return cards.filter(c => isRecall(c) && !c.suspended && c.dueDate <= today)
    if (filter === 'starred') return cards.filter(c => c.starred)
    if (filter === 'wrong') return cards.filter(c => isRecall(c) && (c.lapses ?? 0) > 0)
    return cards
  }, [cards, filter])

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
  const tiers = tierCounts(cards)
  const t = localToday()
  const dueCount = activeCards.filter(c => c.dueDate <= t).length
  const total = recallCards.length
  const cardCount = cards.length
  const starredCount = cards.filter(c => c.starred).length
  const wrongCount = recallCards.filter(c => (c.lapses ?? 0) > 0).length
  const lastReviewed = lastReviewedAt(id)

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
          <button onClick={() => setShowEditor((open) => !open)}
            className="tb-btn" aria-label={S.deckDetail.newCardAction} aria-pressed={showEditor}>
            <PlusIcon size={19} />
          </button>
          <div className="relative">
            <button onClick={() => setShowDeckMenu((open) => !open)}
              className="tb-btn" aria-label={S.deckDetail.moreActions} aria-haspopup="menu" aria-expanded={showDeckMenu}>
              <MoreIcon />
            </button>
            {showDeckMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowDeckMenu(false)} aria-label={S.deckDetail.closeMenu} />
                <div className="absolute right-0 top-9 z-20 min-w-[168px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <Link to={`/browse/${id}`} onClick={() => setShowDeckMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <LayersIcon size={15} /> {S.deckDetail.browseAction}
                  </Link>
                  <Link to={`/review/${id}?all=true`} onClick={() => setShowDeckMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <SparkIcon size={15} /> {S.deckDetail.reviewAllAction}
                  </Link>
                  <Link to={`/import?tab=md&deckId=${id}`} onClick={() => setShowDeckMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <UploadIcon size={15} /> {S.deckDetail.importAction}
                  </Link>
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

      <main className="flex-1 overflow-y-auto">
        <div className="scr dd-screen">
          <FocusHeader
            label={S.deckDetail.focusLabel}
            value={dueCount}
            unit={S.deckDetail.dueUnit}
            sub={S.deckDetail.focusSummary(cardCount, reviewedAgo(lastReviewed))}
            cta={total > 0 ? {
              to: `/review/${id}${dueCount > 0 ? '' : '?all=true'}`,
              label: dueCount > 0 ? S.deckDetail.startReviewAction : S.deckDetail.reviewAllAction,
            } : undefined}
          />

          {showEditor && (
            <div className="dd-editor">
              <CardEditor onSave={handleAdd} onCancel={() => setShowEditor(false)} />
            </div>
          )}

          <div className="dd-tiers" aria-label={S.deckDetail.distributionLabel}>
            {TIER_ROWS.map((row) => (
              <TierRow key={row.key} row={row} count={tiers[row.key]} total={total} />
            ))}
          </div>

          <div className="dd-filters" aria-label={S.deckDetail.filterLabel}>
            <button onClick={() => setFilter('all')} className={`dd-filter ${filter === 'all' ? 'on' : ''}`}>
              {S.deckDetail.allFilter(cardCount)}
            </button>
            <button onClick={() => setFilter('due')} className={`dd-filter ${filter === 'due' ? 'on' : ''}`}>
              {S.deckDetail.dueFilter(dueCount)}
            </button>
            <button onClick={() => setFilter('starred')} className={`dd-filter ${filter === 'starred' ? 'on' : ''}`}>
              {S.deckDetail.starredFilterCount(starredCount)}
            </button>
            <button onClick={() => setFilter('wrong')} className={`dd-filter ${filter === 'wrong' ? 'on' : ''}`}>
              {S.deckDetail.wrongFilter(wrongCount)}
            </button>
          </div>

          {cards.length === 0 ? (
            <div className="empty">
              <div className="msg">{S.deckDetail.emptyCardsTitle}</div>
              <div className="motto-zh">{S.deckDetail.emptyCardsHint}</div>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="dd-filter-empty">{S.deckDetail.filterEmpty}</div>
          ) : (
            <div className="dd-card-list">
              {filteredCards.map((card) => (
                <CardRow key={card.id} card={card} editing={editing} selected={selected.has(card.id)}
                  onToggleSelect={() => toggleSelect(card.id)}
                  onEdit={() => setEditingCard(card)} onDelete={() => handleDelete(card.id)}
                  isEditingThis={editingCard?.id === card.id} onSave={handleEdit} onCancel={() => setEditingCard(null)}
                  onPreview={setPreviewCard} confirm={confirm} />
              ))}
            </div>
          )}

          {editing && (
          <div className="dd-batch-actions">
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
        </div>
      </main>
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
  const tierKey = !isRecall(card) ? 'reference' : card.repetitions === 0 ? 'new' : tier
  const tierLabel = {
    solid: S.deckDetail.solidTier,
    mid: S.deckDetail.midTier,
    weak: S.deckDetail.weakTier,
    new: S.deckDetail.newTier,
    reference: S.deckDetail.referenceTier,
  }[tierKey]

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
      <div className="dd-card-shell group">
        <div className="dd-card-row"
          onClick={() => onPreview?.(card)}
          onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
          {...pressable(() => onPreview?.(card))}>
          {card.starred
            ? <span className="star"><StarIcon size={13} filled /></span>
            : <span className="blank" />}
          <span className="q">{card.front}</span>
          <span className={`t${tierKey === 'weak' ? ' weak' : ''}`}>
            {tierKey === 'weak' && <AlertIcon size={9} />}{tierLabel}
          </span>
        </div>
        <div className="dd-card-tools hidden group-hover:flex group-focus-within:flex gap-1 shrink-0 ml-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-xs px-1.5 py-0.5 rounded border text-ink-2" style={{ borderColor: 'var(--border)' }}>{S.deckDetail.editCard}</button>
          <button onClick={async (e) => { e.stopPropagation(); const ok = await confirm({ title: S.deckDetail.deleteCardTitle, message: S.deckDetail.deleteCardMessage, confirmLabel: S.deckDetail.confirmDelete }); if (ok) onDelete() }}
            className="text-xs px-1.5 py-0.5 rounded border text-critical" style={{ borderColor: 'color-mix(in oklch, var(--danger-critical) 30%, transparent)' }}>{S.deckDetail.deleteCard}</button>
        </div>
      </div>
  )
}
