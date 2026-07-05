// Shared body for ReadingHome and ReadingHomeContent
// Accepts h (useReadingHome return) as props so both wrappers share one hook instance
import { useNavigate, Link } from 'react-router-dom'
import { getDocumentsByCollection } from '../lib/storage'
import { getWeeklyMinutes } from '../lib/stats'
import { PlusIcon, UploadIcon, LayersIcon } from '../../components/Icons'
import { HeroSection } from '../../components/HeroSection'
import EmptyState from '../../components/EmptyState'
import { S } from '../../lib/strings'

export default function ReadingHomeBody({ h }) {
  const navigate = useNavigate()
  const docCount = h.collections.reduce((sum, c) => sum + getDocumentsByCollection(c.id).length, 0)
  const isEmptyLibrary = h.collections.length === 0
  const firstDoc = h.continueDoc || h.collections
    .flatMap((collection) => getDocumentsByCollection(collection.id))
    .find(Boolean)

  return (
    <>
      {/* Search results */}
      {h.query.trim() && (
        h.searchResults.length === 0 ? (
          <div className="text-center text-ink-3 py-6 font-zh text-sm">{S.readingHomeBody.noMatchingDocs}</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="section-title">{S.readingHomeBody.searchResultsHeading}</div>
            {h.searchResults.map(({ doc, snippet }) => (
              <div key={doc.id} className="bg-bg-card rounded-lg p-3 border cursor-pointer hover:border-accent transition-colors"
                style={{ borderColor: 'var(--border-soft)' }}
                onClick={() => navigate(`/reading/doc/${doc.id}?col=${doc.collectionId}`)}>
                <div className="font-zh text-[14px] text-ink font-medium truncate">{doc.title}</div>
                {snippet && <div className="font-zh text-[11px] text-ink-3 mt-1 line-clamp-2">{snippet}</div>}
              </div>
            ))}
          </div>
        )
      )}

      {!h.query.trim() && (
        <>
          {/* Hero — weekly reading chart */}
          {(() => {
            const weekly = getWeeklyMinutes()
            const maxCount = Math.max(1, ...weekly.chart.map(d => d.count))
            return (
              <HeroSection
                label={isEmptyLibrary ? S.readingHomeBody.readyLabel : S.readingHomeBody.thisWeekLabel}
                right={isEmptyLibrary
                  ? { text: S.readingHomeBody.pendingImport }
                  : { text: S.readingHomeBody.minutesSuffix(weekly.totalThisWeek), color: 'var(--good)' }}
                metrics={isEmptyLibrary
                  ? [
                      { value: h.collections.length, zhLabel: S.readingHomeBody.colsZhLabel, accent: true },
                      { value: weekly.totalThisWeek, zhLabel: S.readingHomeBody.minZhLabel },
                      { value: docCount, zhLabel: S.readingHomeBody.docsZhLabel },
                    ]
                  : [
                      { value: weekly.totalThisWeek, zhLabel: S.readingHomeBody.minZhLabel, accent: true },
                      { value: h.stats.docsCompleted, zhLabel: S.readingHomeBody.doneZhLabel },
                      { value: docCount, zhLabel: S.readingHomeBody.docsZhLabel },
                    ]}
                chartData={weekly.chart}
                chartColor="good"
                chartMax={maxCount}
                to="/activity"
                cta={firstDoc ? {
                  to: `/reading/doc/${firstDoc.id}?col=${firstDoc.collectionId}`,
                  label: S.readingHomeBody.startReadingAction,
                  count: docCount,
                } : null}
              />
            )
          })()}

          {h.continueDoc && !h.dismissedContinue && (
            <div className="deck group" onClick={() => navigate(`/reading/doc/${h.continueDoc.id}?col=${h.continueDoc.collectionId}`)}>
              <div className={`deck-spine ${['h0','h1','h2','h3'][Math.abs(h.continueDoc.title.charCodeAt(0)) % 4]}`}>
                <span className="glyph">{h.continueDoc.title.charAt(0)}</span>
              </div>
              <div className="deck-meta">
                <div className="deck-name">{h.continueDoc.title}</div>
                <div className="deck-stats">
                  <span className="due" style={{ fontFamily: 'var(--font-zh)' }}>{S.readingHomeBody.continueReading}</span>
                  <span className="dot">·</span>
                  <span>{h.continueDoc.scrollPct}%</span>
                </div>
              </div>
              <div className="deck-cta">
                <button onClick={(e) => { e.stopPropagation(); h.setDismissedContinue(true) }}
                  className="text-ink-3 hover:text-ink text-xs px-1">✕</button>
              </div>
            </div>
          )}

          <div className="list-head">
            <div className="section-title">{S.readingHomeBody.collectionsHeading}</div>
            <span className="count">{h.collections.length}</span>
          </div>

          {h.collections.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="seg" style={{ display: 'inline-flex', width: 'auto' }}>
                {[{ key: 'created', label: S.readingHomeBody.createdSort }, { key: 'recent', label: S.readingHomeBody.recentSort }].map(s => (
                  <button key={s.key} onClick={() => h.setSortBy(s.key)} className={h.sortBy === s.key ? 'on' : ''}>{s.label}</button>
                ))}
              </div>
            </div>
          )}

          {h.sorted.length === 0 && !h.showNewCol && (
            <EmptyState
              icon={<LayersIcon size={48} />}
              title={S.readingHomeBody.emptyCollectionsTitle}
              hint={S.readingHomeBody.emptyCollectionsHint}
            />
          )}

          {h.sorted.map((col) => {
            const docs = getDocumentsByCollection(col.id)
            const lastDoc = docs.length > 0
              ? docs.reduce((best, d) => ((d.lastReadAt || '') > (best.lastReadAt || '') ? d : best))
              : null
            const COLORS = ['h0', 'h1', 'h2', 'h3']
            const hueClass = COLORS[Math.abs(col.name.charCodeAt(0)) % 4]
            const glyph = col.name.charAt(0)

            return (
              <div key={col.id} className="deck group" onClick={() => navigate(`/collection/${col.id}`)}>
                <div className={`deck-spine ${hueClass}`}>
                  <span className="glyph">{glyph}</span>
                </div>
                <div className="deck-meta">
                  <div className="deck-name">
                    {col.name}
                    {col.pinned && <span className="deck-pin">◆</span>}
                  </div>
                  <div className="deck-stats">
                    <span>{docs.length}{S.readingHomeBody.docsCountSuffix}</span>
                  </div>
                </div>
                <div className="deck-cta" style={{ gap: 6 }}>
                  {docs.length > 0 && (
                    <button className="cta-pill" onClick={(e) => {
                      e.stopPropagation()
                      navigate(lastDoc?.lastReadAt ? `/reading/doc/${lastDoc.id}?col=${col.id}` : `/collection/${col.id}`)
                    }}>
                      {S.readingHomeBody.readAction}<span className="arr">→</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* New document form */}
          {h.showNewDoc && (
            <form onSubmit={h.handleAddDocument} className="bg-bg-card rounded-lg p-4 border flex flex-col gap-3"
              style={{ borderColor: 'var(--border-soft)' }}>
              <div className="font-zh text-[10px] text-ink-3 tracking-wider">{S.readingHomeBody.newDocHeading}</div>
              <input value={h.newDocTitle} onChange={e => h.setNewDocTitle(e.target.value)}
                placeholder={S.readingHomeBody.docTitlePlaceholder} autoFocus
                className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
              <textarea value={h.newDocContent} onChange={e => h.setNewDocContent(e.target.value)}
                placeholder={S.readingHomeBody.docContentPlaceholder} rows={8}
                className="w-full p-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent resize-none"
                style={{ borderColor: 'var(--border)' }} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => h.setShowNewDoc(null)}
                  className="btn btn-ghost">{S.readingHomeBody.cancel}</button>
                <button type="submit" disabled={!h.newDocTitle.trim() || !h.newDocContent.trim()}
                  className="btn btn-primary disabled:opacity-40">{S.readingHomeBody.create}</button>
              </div>
            </form>
          )}

        </>
      )}

      {/* Bottom actions */}
      <div className="bottom-actions">
        {h.showNewCol ? (
          <form onSubmit={h.handleAddCollection} className="col-span-2 flex gap-2">
            <input value={h.newColName} onChange={e => h.setNewColName(e.target.value)} placeholder={S.readingHomeBody.newColNamePlaceholder} autoFocus
              className="flex-1 px-3 py-2.5 rounded-md border bg-bg-card text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)' }} />
            <button type="submit" disabled={!h.newColName.trim()}
              className="px-4 py-2.5 rounded-md font-medium text-sm font-body bg-ink text-bg active:scale-[0.97] transition-transform disabled:opacity-40">
              {S.readingHomeBody.create}
            </button>
            <button type="button" onClick={() => { h.setShowNewCol(false); h.setNewColName('') }}
              className="px-4 py-2.5 rounded-md font-body text-sm border text-ink-2 active:scale-[0.97] transition-transform"
              style={{ borderColor: 'var(--border)' }}>
              {S.readingHomeBody.cancel}
            </button>
          </form>
        ) : (
          <>
            <Link to="/import?tab=reading" className="btn btn-ghost">
              <UploadIcon size={16} /> {S.readingHomeBody.importAction}
            </Link>
            <button onClick={() => h.setShowNewCol(true)} className="btn btn-primary">
              <PlusIcon size={16} /> {S.readingHomeBody.newCollectionAction}
            </button>
          </>
        )}
      </div>

    </>
  )
}
