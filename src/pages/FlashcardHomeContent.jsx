import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, UploadIcon, ChevronRIcon, AlertIcon, XIcon } from '../components/Icons'
import { getAllDeckStats } from '../lib/scheduler'
import { addDeck } from '../lib/storage'
import { FocusHeader, ForecastStrip } from '../components/FocusHeader'
import { MasteryMeter } from '../components/MasteryMeter'
import { ActionButton } from '../components/ActionButton'
import { loadReviewSession, clearReviewSession } from '../lib/reviewSession'
import { todayFocus, forecast7, deckProgress } from '../lib/derive'
import EmptyState from '../components/EmptyState'
import { S } from '../lib/strings'

const F = S.flashcardHome

/** 相对时刻——「多久以前」比绝对时刻更能回答「这册该不该动了」。 */
function timeAgo(ms) {
  if (ms == null) return F.neverReviewed
  const mins = Math.floor((Date.now() - ms) / 60000)
  if (mins < 1) return F.reviewedAgo(F.justNow)
  if (mins < 60) return F.reviewedAgo(F.minutesAgo(mins))
  const hours = Math.floor(mins / 60)
  if (hours < 24) return F.reviewedAgo(F.hoursAgo(hours))
  return F.reviewedAgo(F.daysAgo(Math.floor(hours / 24)))
}

/**
 * 卡组行（版3）——行即入口，故不再有行内 CTA（版2：主行动唯一）。
 * 承载四事：名、熟练度计、需人动手者几何、上次何时动过。
 */
function DeckRow({ deck }) {
  const progress = useMemo(() => deckProgress(deck.id), [deck.id])
  return (
    <Link to={`/deck/${deck.id}`} className="deck">
      <span className="deck-glyph">{deck.name.charAt(0)}</span>
      <span className="deck-meta">
        <span className="deck-name">{deck.name}</span>
        <MasteryMeter ratio={progress.masteryRatio} />
        <span className="deck-line">
          {progress.weak > 0 ? (
            <span className="weak"><AlertIcon size={9} />{F.weakPrefix}{progress.weak}</span>
          ) : (
            <span>{F.masteryLabel(progress.solid, progress.total)}</span>
          )}
          <span className="sep">·</span>
          <span className="zh">{timeAgo(progress.lastReviewedAt)}</span>
        </span>
      </span>
      <span className="deck-right">
        {deck.dueCount > 0
          ? <span className="deck-due">{deck.dueCount}</span>
          : <span className="deck-done">{F.done}</span>}
        <ChevronRIcon size={15} />
      </span>
    </Link>
  )
}

export function FlashcardHomeContent() {
  const [decks, setDecks] = useState([])
  const [showNewDeck, setShowNewDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')
  const navigate = useNavigate()

  const refresh = () => setDecks(getAllDeckStats())
  useEffect(refresh, [])

  const focus = useMemo(() => todayFocus(), [decks])
  const forecast = useMemo(() => forecast7(), [decks])
  const [session, setSession] = useState(() => loadReviewSession())

  // 待复习优先，其次置顶——列表之序即「先做哪个」之答
  const sorted = [...decks].sort((a, b) =>
    (b.dueCount - a.dueCount) || ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
  )

  const createDeck = async () => {
    const name = newDeckName.trim()
    if (!name) throw new Error(F.createFailed)
    addDeck(name)
    setNewDeckName('')
    setShowNewDeck(false)
    refresh()
    return F.deckCreatedNotice(name) // 表单就此关掉，确认语交 ActionNotice 承（记-32）
  }

  const isEmpty = decks.length === 0
  const cta = focus.primary && {
    to: `/review/${focus.primary.deckId}${focus.primary.all ? '?all=true' : ''}`,
    label: focus.primary.all ? F.reviewAllAction : F.startReviewAction,
  }

  return (
    <div className="scr">
      <FocusHeader
        label={isEmpty ? F.readyLabel : F.todayLabel}
        value={isEmpty ? 0 : focus.dueTotal}
        unit={isEmpty ? F.emptyUnit : F.dueUnit}
        sub={focus.breakdown.length > 0
          ? focus.breakdown.map((d) => F.breakdownItem(d.name, d.due)).join(F.breakdownJoin)
          : null}
        cta={cta}
      />

      {!isEmpty && (
        <ForecastStrip
          data={forecast}
          labels={F.dayLabels}
          title={F.forecastTitle}
          formatTotal={F.forecastTotal}
        />
      )}

      {/* 续读——只在真有中断之会话时出现 */}
      {session && (
        <div className="resume">
          <button className="resume-body" onClick={() => navigate(`/review/${session.deckId}`)}>
            <span className="resume-name">{session.deckName}</span>
            <span className="resume-meta">
              {F.continueReview}<span className="sep">·</span>{session.dueCount}{F.dueCountSuffix}
            </span>
          </button>
          <button className="resume-x" aria-label={F.dismissContinue}
            onClick={() => { clearReviewSession(); setSession(null) }}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="list-head">
        <span className="t">{F.decksTitle}<em>{decks.length}</em></span>
        <Link to="/activity" className="list-link">{F.activityLink}<ChevronRIcon size={12} /></Link>
      </div>

      {isEmpty ? (
        <EmptyState title={F.emptyDecksTitle} hint={F.emptyDecksHint} />
      ) : (
        <div className="rows">
          {sorted.map((deck) => <DeckRow key={deck.id} deck={deck} />)}
        </div>
      )}

      <div className="sub-actions">
        {showNewDeck ? (
          <form className="new-deck" onSubmit={(e) => e.preventDefault()}>
            <input value={newDeckName} onChange={(e) => setNewDeckName(e.target.value)}
              placeholder={F.deckNamePlaceholder} autoFocus />
            <ActionButton
              onAction={createDeck}
              label={F.add}
              pendingLabel={F.creatingDeck}
              doneLabel={F.deckCreated}
              retryLabel={F.createRetry}
              disabled={!newDeckName.trim()}
            />
            <button type="button" className="btn btn-ghost"
              onClick={() => { setShowNewDeck(false); setNewDeckName('') }}>{F.cancel}</button>
          </form>
        ) : (
          <>
            <Link to="/import?tab=md" className="btn btn-ghost">
              <UploadIcon size={15} />{F.importAction}
            </Link>
            <button className="btn btn-ghost" onClick={() => setShowNewDeck(true)}>
              <PlusIcon size={15} />{F.newDeckAction}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
