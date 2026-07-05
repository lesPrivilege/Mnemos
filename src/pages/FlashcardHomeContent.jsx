import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, UploadIcon, MnemosMark } from '../components/Icons'
import { getAllDeckStats } from '../lib/scheduler'
import { addDeck, deleteDecks, loadData } from '../lib/storage'
import { localToday, isoToLocalDate, localDow, formatLocalDate } from '../lib/dateUtils'
import { HeroSection } from '../components/HeroSection'
import { loadReviewSession, clearReviewSession } from '../lib/reviewSession'
import EmptyState from '../components/EmptyState'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'

const DAY_LABELS = S.flashcardHome.dayLabels

function computeStreak() {
  const data = loadData()
  const reviewDays = new Set()
  for (const card of data.cards) {
    if (card.updatedAt && card.repetitions > 0) {
      // updatedAt is a UTC ISO string; convert to local YYYY-MM-DD before
      // comparing to the local-date keys we build below.
      reviewDays.add(isoToLocalDate(card.updatedAt))
    }
  }
  if (reviewDays.size === 0) return 0
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatLocalDate(d)
    if (reviewDays.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}

export function FlashcardHomeContent() {
  const [decks, setDecks] = useState([])
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const { toast } = useToast()
  const { confirmState, confirm } = useConfirm()

  const refresh = () => setDecks(getAllDeckStats())
  useEffect(refresh, [])

  const handleAddDeck = (e) => {
    e.preventDefault()
    if (!newDeckName.trim()) return
    addDeck(newDeckName.trim())
    setNewDeckName('')
    setShowNewDeck(false)
    refresh()
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (selected.size === 0) return
    const ok = await confirm({ title: S.flashcardHome.batchDeleteTitle, message: S.flashcardHome.batchDeleteMessage(selected.size), confirmLabel: S.flashcardHome.confirmDelete })
    if (!ok) return
    deleteDecks([...selected])
    setSelected(new Set())
    setEditing(false)
    refresh()
  }

  const navigate = useNavigate()
  const sorted = [...decks].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0)
  const reviewedToday = decks.reduce((sum, d) => sum + d.reviewedToday, 0)
  const totalCards = decks.reduce((sum, d) => sum + d.totalCards, 0)
  const isEmptyLibrary = decks.length === 0
  const primaryDeck = sorted.find((deck) => deck.dueCount > 0) || sorted[0]

  const futureDistribution = decks.reduce((merged, deck) => {
    if (merged.length === 0) return deck.futureDistribution.map((d) => ({ ...d }))
    return merged.map((d, i) => ({
      ...d,
      count: d.count + (deck.futureDistribution[i]?.count || 0),
    }))
  }, [])
  const todayStr = localToday()
  // Project the rolling forecast onto a fixed Sun→Sat axis, matching the quiz tab.
  // Use local-date parsing so `dow` and `isToday` agree with the user's timezone.
  const weekChart = (() => {
    const slots = Array.from({ length: 7 }, (_, dow) => ({ dow, date: null, count: 0, isToday: false }))
    for (const d of futureDistribution) {
      const dow = localDow(d.date)
      const slot = slots[dow]
      // First date hitting this weekday wins (forecast covers each weekday at most once)
      if (slot.date == null) {
        slot.date = d.date
        slot.count = d.count
        slot.isToday = d.date === todayStr
      }
    }
    return slots
  })()
  const maxCount = Math.max(1, ...weekChart.map((d) => d.count))
  const streak = useMemo(() => computeStreak(), [])
  const starredCount = useMemo(() => loadData().cards.filter(c => c.starred).length, [])
  const [reviewSession, setReviewSession] = useState(() => loadReviewSession())
  const dismissReviewSession = () => { clearReviewSession(); setReviewSession(null) }

  const streakParts = []
  if (streak > 0) streakParts.push(S.flashcardHome.streakLabel(streak))
  if (starredCount > 0) streakParts.push(S.flashcardHome.starredCountLabel(starredCount))
  const heroRight = isEmptyLibrary
    ? { text: S.flashcardHome.pendingImport }
    : streakParts.length > 0 ? { text: streakParts.join(' · ') } : null

  const DECK_COLORS = ['h0', 'h1', 'h2', 'h3']

  return (
    <div className="p-[18px] pb-8 flex flex-col gap-4">
      {/* Hero — hidden in edit mode */}
      {!editing && (
        <HeroSection
          label={isEmptyLibrary ? S.flashcardHome.readyLabel : S.flashcardHome.todayLabel}
          right={heroRight}
          metrics={isEmptyLibrary
            ? [
                { value: decks.length, zhLabel: S.flashcardHome.decksZh, accent: true },
                { value: totalDue, zhLabel: S.flashcardHome.dueZh },
                { value: totalCards, zhLabel: S.flashcardHome.cardsZh },
              ]
            : [
                { value: totalDue, zhLabel: S.flashcardHome.dueZh, accent: true },
                { value: reviewedToday, zhLabel: S.flashcardHome.todayZh },
                { value: totalCards, zhLabel: S.flashcardHome.totalZh },
              ]}
          chartData={weekChart.map(d => ({ count: d.count, isToday: d.isToday, label: DAY_LABELS[d.dow] }))}
          chartColor=""
          chartMax={maxCount}
          to="/activity"
          cta={primaryDeck ? {
            to: `/review/${primaryDeck.id}${primaryDeck.dueCount > 0 ? '' : '?all=true'}`,
            label: S.flashcardHome.startReviewAction,
            count: totalDue > 0 ? totalDue : totalCards,
          } : null}
        />
      )}

      {/* Continue review card */}
      {!editing && reviewSession && (
        <div className="deck group" onClick={() => navigate(`/review/${reviewSession.deckId}`)}>
          <div className={`deck-spine ${DECK_COLORS[Math.abs(reviewSession.deckName.charCodeAt(0)) % 4]}`}>
            <span className="glyph">{reviewSession.deckName.charAt(0)}</span>
          </div>
          <div className="deck-meta">
            <div className="deck-name">{reviewSession.deckName}</div>
            <div className="deck-stats">
              <span className="due" style={{ fontFamily: 'var(--font-zh)' }}>{S.flashcardHome.continueReview}</span>
              <span className="dot">·</span>
              <span>{reviewSession.dueCount}{S.flashcardHome.dueCountSuffix}</span>
            </div>
          </div>
          <div className="deck-cta">
            <button onClick={(e) => { e.stopPropagation(); dismissReviewSession() }}
              className="text-ink-3 hover:text-ink text-xs px-1">✕</button>
          </div>
        </div>
      )}

      {/* Decks section header */}
      <div className="list-head">
        <div className="section-title">{S.flashcardHome.decksTitle}</div>
        <span className="count">{decks.length}</span>
      </div>

      {/* Deck list */}
      {decks.length === 0 ? (
        <EmptyState
          icon={<MnemosMark size={48} accent="var(--accent)" />}
          title={S.flashcardHome.emptyDecksTitle}
          hint={S.flashcardHome.emptyDecksHint}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((deck) => {
            const hueClass = DECK_COLORS[Math.abs(deck.name.charCodeAt(0)) % 4]
            const glyph = deck.name.charAt(0)
            if (editing) {
              return (
                <button key={deck.id} onClick={() => toggleSelect(deck.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-md transition-colors text-left
                    ${selected.has(deck.id)
                      ? 'bg-accent/5 border border-accent'
                      : 'bg-bg-card border'}`}
                  style={{ borderColor: selected.has(deck.id) ? undefined : 'var(--border-soft)' }}>
                  <div className={`w-5 h-5 rounded border shrink-0 flex items-center justify-center
                    ${selected.has(deck.id) ? 'bg-accent border-accent' : 'border-border'}`}>
                    {selected.has(deck.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-zh text-[15px] font-medium text-ink truncate">{deck.name}</div>
                    <div className="font-mono text-[11px] text-ink-3 mt-1">
                      {deck.dueCount} due · {deck.totalCards} total
                    </div>
                  </div>
                </button>
              )
            }
            return (
                <Link key={deck.id} to={`/deck/${deck.id}`}
                  className="deck group">
                  <div className={`deck-spine ${hueClass}`}>
                    <span className="glyph">{glyph}</span>
                  </div>
                  <div className="deck-meta">
                    <div className="deck-name">
                      {deck.name}
                      {deck.pinned && <span className="deck-pin">◆</span>}
                    </div>
                    <div className="deck-stats">
                      {deck.dueCount > 0
                        ? <><span className="due">{deck.dueCount}</span><span>{S.flashcardHome.due}</span></>
                        : <span style={{ color: 'var(--good)', fontFamily: 'var(--font-zh)' }}>{S.flashcardHome.done}</span>}
                      <span className="dot">·</span>
                      <span>{deck.totalCards}{S.flashcardHome.cardsSuffix}</span>
                    </div>
                  </div>
                  <div className="deck-cta" style={{ gap: 6 }}>
                    {deck.dueCount > 0 ? (
                      <button className="cta-pill" onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/review/${deck.id}`) }}>
                        {S.flashcardHome.reviewAction}<span className="arr">→</span>
                      </button>
                    ) : null}
                  </div>
                </Link>
            )
          })}
        </div>
      )}

      {/* Edit mode batch delete */}
      {editing && (
        <div className="flex gap-2 mt-2">
          {selected.size > 0 && (
            <button onClick={handleBatchDelete}
              className="flex-1 py-2.5 rounded-md font-body text-sm text-danger border active:scale-[0.97] transition-transform"
              style={{ borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)' }}>
              {S.flashcardHome.batchDeleteLabel(selected.size)}
            </button>
          )}
          <button onClick={async () => {
            const ok = await confirm({ title: S.flashcardHome.deleteAllTitle, message: S.flashcardHome.deleteAllMessage(decks.length), confirmLabel: S.flashcardHome.confirmDelete })
            if (!ok) return
            deleteDecks(decks.map((d) => d.id))
            setSelected(new Set())
            setEditing(false)
            refresh()
          }}
            className="flex-1 py-2.5 rounded-md font-body text-sm text-danger border active:scale-[0.97] transition-transform"
            style={{ borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)' }}>
              {S.flashcardHome.deleteAllButton}
          </button>
        </div>
      )}

      {/* Bottom actions — hidden in edit mode */}
      {!editing && (
        <div className="bottom-actions">
          {showNewDeck ? (
            <form onSubmit={handleAddDeck} className="col-span-2 flex gap-2">
              <input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)}
                placeholder={S.flashcardHome.deckNamePlaceholder} autoFocus
                className="flex-1 px-3 py-2.5 rounded-md border bg-bg-card text-ink font-body text-sm placeholder:text-ink-3 focus:outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
              <button type="submit" disabled={!newDeckName.trim()}
                className="px-4 py-2.5 rounded-md font-medium text-sm font-body bg-ink text-bg active:scale-[0.97] transition-transform disabled:opacity-40">
                {S.flashcardHome.add}
              </button>
              <button type="button" onClick={() => { setShowNewDeck(false); setNewDeckName('') }}
                className="px-4 py-2.5 rounded-md font-body text-sm border text-ink-2 active:scale-[0.97] transition-transform"
                style={{ borderColor: 'var(--border)' }}>
                {S.flashcardHome.cancel}
              </button>
            </form>
          ) : (
            <>
              <Link to="/import?tab=md"
                className="btn btn-ghost">
                <UploadIcon size={16} /> {S.flashcardHome.importAction}
              </Link>
              <button onClick={() => setShowNewDeck(true)}
                className="btn btn-primary">
                <PlusIcon size={16} /> {S.flashcardHome.newDeckAction}
              </button>
            </>
          )}
        </div>
      )}
      <Toast message={toast} />
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
