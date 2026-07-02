import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, UploadIcon, FlameIcon, StarIcon, PinIcon, MnemosMark } from '../components/Icons'
import { getAllDeckStats } from '../lib/scheduler'
import { addDeck, deleteDecks, togglePin, loadData } from '../lib/storage'
import { localToday, isoToLocalDate, localDow, formatLocalDate } from '../lib/dateUtils'
import { HeroSection } from '../components/HeroSection'
import { loadReviewSession, clearReviewSession } from '../lib/reviewSession'
import EmptyState from '../components/EmptyState'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

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
  const { toast, showToast } = useToast()
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
    const ok = await confirm({ title: '批量删除', message: `删除 ${selected.size} 个卡组及其所有卡片？此操作不可撤销。`, confirmLabel: '确认删除' })
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

  const DECK_COLORS = ['h0', 'h1', 'h2', 'h3']

  return (
    <div className="p-[18px] pb-8 flex flex-col gap-4">
      {/* Hero — hidden in edit mode */}
      {!editing && (
        <HeroSection
          label={isEmptyLibrary ? '准备 · READY' : '今日 · TODAY'}
          right={[
            ...(isEmptyLibrary ? [{ icon: <UploadIcon size={14} />, text: '待导入' }] : []),
            ...(!isEmptyLibrary && streak > 0 ? [{ icon: <FlameIcon size={14} />, text: `${streak} 日` }] : []),
            ...(!isEmptyLibrary && starredCount > 0 ? [{ icon: <StarIcon size={14} />, text: String(starredCount) }] : []),
          ]}
          metrics={isEmptyLibrary
            ? [
                { value: decks.length, label: 'DECKS', zhLabel: '卡组', accent: true },
                { value: totalDue, label: 'DUE', zhLabel: '待复习' },
                { value: totalCards, label: 'CARDS', zhLabel: '卡片' },
              ]
            : [
                { value: totalDue, label: 'DUE', zhLabel: '待复习', accent: true },
                { value: reviewedToday, label: 'DONE', zhLabel: '今日' },
                { value: totalCards, label: 'TOTAL', zhLabel: '总数' },
              ]}
          chartData={weekChart.map(d => ({ count: d.count, isToday: d.isToday, label: DAY_LABELS[d.dow] }))}
          chartColor=""
          chartMax={maxCount}
          to="/activity"
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
              <span className="due">继续复习</span>
              <span className="dot">·</span>
              <span>{reviewSession.dueCount} 张待复习</span>
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
        <div className="section-title">卡组 · DECKS</div>
        <span className="count">{decks.length}</span>
      </div>

      {/* Deck list */}
      {decks.length === 0 ? (
        <EmptyState
          icon={<MnemosMark size={48} accent="var(--accent)" />}
          title="暂无卡组"
          hint="导入或新建卡组即可开始"
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
                        ? <><span className="due">{deck.dueCount}</span><span>待复习</span></>
                        : <span style={{ color: 'var(--good)' }}>已完成</span>}
                      <span className="dot">·</span>
                      <span>{deck.totalCards} 张</span>
                    </div>
                  </div>
                  <div className="deck-cta" style={{ gap: 6 }}>
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 opacity-40 hover:opacity-100 hover:text-accent hover:bg-accent-soft transition-colors flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePin(deck.id); refresh() }}
                      title={deck.pinned ? '取消置顶' : '置顶卡组'}
                      aria-label={deck.pinned ? '取消置顶' : '置顶卡组'}>
                      <PinIcon size={15} filled={deck.pinned} />
                    </button>
                    <button
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 opacity-40 hover:opacity-100 hover:text-danger hover:bg-danger-soft transition-colors flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); confirm({ title: '删除卡组', message: `删除卡组「${deck.name}」？此操作不可撤销。`, confirmLabel: '确认删除' }).then(ok => { if (ok) { deleteDecks([deck.id]); refresh() } }) }}
                      title="删除卡组">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                    {deck.dueCount > 0 ? (
                      <button className="cta-pill" onClick={(e) => { e.stopPropagation(); e.preventDefault(); navigate(`/review/${deck.id}`) }}>
                        复习<span className="arr">→</span>
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
              删除 ({selected.size})
            </button>
          )}
          <button onClick={async () => {
            const ok = await confirm({ title: '全部删除', message: `删除全部 ${decks.length} 个卡组及其所有卡片？此操作不可撤销。`, confirmLabel: '确认删除' })
            if (!ok) return
            deleteDecks(decks.map((d) => d.id))
            setSelected(new Set())
            setEditing(false)
            refresh()
          }}
            className="flex-1 py-2.5 rounded-md font-body text-sm text-danger border active:scale-[0.97] transition-transform"
            style={{ borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)' }}>
              全部删除
          </button>
        </div>
      )}

      {/* Bottom actions — hidden in edit mode */}
      {!editing && (
        <div className="bottom-actions">
          {showNewDeck ? (
            <form onSubmit={handleAddDeck} className="col-span-2 flex gap-2">
              <input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="卡组名称" autoFocus
                className="flex-1 px-3 py-2.5 rounded-md border bg-bg-card text-ink font-body text-sm placeholder:text-ink-3 focus:outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
              <button type="submit" disabled={!newDeckName.trim()}
                className="px-4 py-2.5 rounded-md font-medium text-sm font-body bg-ink text-bg active:scale-[0.97] transition-transform disabled:opacity-40">
                添加
              </button>
              <button type="button" onClick={() => { setShowNewDeck(false); setNewDeckName('') }}
                className="px-4 py-2.5 rounded-md font-body text-sm border text-ink-2 active:scale-[0.97] transition-transform"
                style={{ borderColor: 'var(--border)' }}>
                取消
              </button>
            </form>
          ) : (
            <>
              <Link to="/import?tab=md"
                className="btn btn-ghost">
                <UploadIcon size={16} /> 导入
              </Link>
              <button onClick={() => setShowNewDeck(true)}
                className="btn btn-primary">
                <PlusIcon size={16} /> 新建卡组
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
