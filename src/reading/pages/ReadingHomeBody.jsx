// Shared body for ReadingHome and ReadingHomeContent
// Accepts h (useReadingHome return) as props so both wrappers share one hook instance
import { useNavigate, Link } from 'react-router-dom'
import { getDocumentsByCollection } from '../lib/storage'
import { getWeeklyMinutes } from '../lib/stats'
import { PlusIcon, UploadIcon, ChevronRIcon, XIcon } from '../../components/Icons'
import { FocusHeader } from '../../components/FocusHeader'
import { MasteryMeter } from '../../components/MasteryMeter'
import { ActionButton } from '../../components/ActionButton'
import EmptyState from '../../components/EmptyState'
import { S } from '../../lib/strings'

const R = S.readingHomeBody

/** 读毕之界：滚过 95% 即算读完——留 5% 给页尾注与滚动惯性。 */
const DONE_PCT = 95
const isDone = (doc) => (doc.scrollPct ?? 0) >= DONE_PCT

/**
 * 集合行——与卡组行、科目行同一行款（版3）。
 * 旧行只有「N 篇文档」一句，并挂一个行内「阅读」钮；後者与整行入口重复
 * （判例八第三问），删。今补进度计与「几篇未读完」。
 */
function CollectionRow({ col, navigate }) {
  const docs = getDocumentsByCollection(col.id)
  const done = docs.filter(isDone).length
  const pending = docs.length - done
  const glyph = col.icon && col.icon !== '📖' ? col.icon : col.name.charAt(0)

  return (
    <button className="deck" onClick={() => navigate(`/collection/${col.id}`)}>
      <span className="deck-glyph">{glyph}</span>
      <span className="deck-meta">
        <span className="deck-name">
          {col.name}
          {col.pinned && <span className="deck-pin">◆</span>}
        </span>
        <MasteryMeter ratio={docs.length === 0 ? 0 : done / docs.length} />
        <span className="deck-line">
          <span>{R.docsProgress(done, docs.length)}</span>
        </span>
      </span>
      <span className="deck-right">
        {pending > 0
          ? <span className="deck-due">{pending}</span>
          : <span className="deck-done">{R.allRead}</span>}
        <ChevronRIcon size={15} />
      </span>
    </button>
  )
}

export default function ReadingHomeBody({ h }) {
  const navigate = useNavigate()
  const allDocs = h.collections.flatMap((c) => getDocumentsByCollection(c.id))
  const pending = allDocs.filter((d) => !isDone(d))
  const isEmpty = h.collections.length === 0
  const resumeDoc = h.continueDoc || pending[0] || allDocs[0]
  const weekly = getWeeklyMinutes()

  const addCollection = async () => {
    const name = h.newColName.trim()
    if (!name) throw new Error(R.nameRequired)
    await h.handleAddCollection({ preventDefault() {} })
    return R.createdNotice(name) // 同上（记-32）
  }

  if (h.query.trim()) {
    return h.searchResults.length === 0 ? (
      <EmptyState title={R.noMatchingDocs} hint={R.searchHint} />
    ) : (
      <div className="rows">
        {h.searchResults.map(({ doc, snippet }) => (
          <button key={doc.id} className="deck"
            onClick={() => navigate(`/reading/doc/${doc.id}?col=${doc.collectionId}`)}>
            <span className="deck-glyph">{doc.title.charAt(0)}</span>
            <span className="deck-meta">
              <span className="deck-name">{doc.title}</span>
              {snippet && <span className="deck-snippet">{snippet}</span>}
            </span>
            <span className="deck-right"><ChevronRIcon size={15} /></span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <FocusHeader
        label={isEmpty ? R.readyLabel : R.readingLabel}
        value={isEmpty ? 0 : pending.length}
        unit={isEmpty ? R.emptyUnit : R.pendingUnit}
        sub={isEmpty ? null : R.weekSummary(weekly.totalThisWeek, allDocs.length)}
        cta={resumeDoc ? {
          to: `/reading/doc/${resumeDoc.id}?col=${resumeDoc.collectionId}`,
          label: h.continueDoc ? R.continueReading : R.startReadingAction,
        } : null}
      />

      {h.continueDoc && !h.dismissedContinue && (
        <div className="resume">
          <button className="resume-body"
            onClick={() => navigate(`/reading/doc/${h.continueDoc.id}?col=${h.continueDoc.collectionId}`)}>
            <span className="resume-name">{h.continueDoc.title}</span>
            <span className="resume-meta">
              {R.continueReading}<span className="sep">·</span>{h.continueDoc.scrollPct}%
            </span>
          </button>
          <button className="resume-x" aria-label={R.dismissContinue}
            onClick={() => h.setDismissedContinue(true)}>
            <XIcon size={14} />
          </button>
        </div>
      )}

      <div className="list-head">
        <span className="t">{R.collectionsHeading}<em>{h.collections.length}</em></span>
        {h.collections.length > 0 ? (
          <div className="seg-inline">
            {[{ key: 'created', label: R.createdSort }, { key: 'recent', label: R.recentSort }].map((s) => (
              <button key={s.key} onClick={() => h.setSortBy(s.key)}
                className={h.sortBy === s.key ? 'on' : ''}>{s.label}</button>
            ))}
          </div>
        ) : (
          <Link to="/activity" className="list-link">{R.activityLink}<ChevronRIcon size={12} /></Link>
        )}
      </div>

      {h.sorted.length === 0 && !h.showNewCol ? (
        <EmptyState title={R.emptyCollectionsTitle} hint={R.emptyCollectionsHint} />
      ) : (
        <div className="rows">
          {h.sorted.map((col) => <CollectionRow key={col.id} col={col} navigate={navigate} />)}
        </div>
      )}

      {h.showNewDoc && (
        <form onSubmit={h.handleAddDocument} className="new-doc">
          <span className="new-doc-title">{R.newDocHeading}</span>
          <input value={h.newDocTitle} onChange={(e) => h.setNewDocTitle(e.target.value)}
            placeholder={R.docTitlePlaceholder} autoFocus />
          <textarea value={h.newDocContent} onChange={(e) => h.setNewDocContent(e.target.value)}
            placeholder={R.docContentPlaceholder} rows={8} />
          <div className="new-doc-actions">
            <button type="button" className="btn btn-ghost"
              onClick={() => h.setShowNewDoc(null)}>{R.cancel}</button>
            <button type="submit" className="btn btn-primary"
              disabled={!h.newDocTitle.trim() || !h.newDocContent.trim()}>{R.create}</button>
          </div>
        </form>
      )}

      <div className="sub-actions">
        {h.showNewCol ? (
          <div className="new-deck">
            <input value={h.newColName} onChange={(e) => h.setNewColName(e.target.value)}
              placeholder={R.newColNamePlaceholder} autoFocus />
            <ActionButton
              onAction={addCollection}
              label={R.create}
              pendingLabel={R.creating}
              doneLabel={R.created}
              retryLabel={R.createRetry}
              disabled={!h.newColName.trim()}
            />
            <button type="button" className="btn btn-ghost"
              onClick={() => { h.setShowNewCol(false); h.setNewColName('') }}>{R.cancel}</button>
          </div>
        ) : (
          <>
            <Link to="/import?tab=reading" className="btn btn-ghost">
              <UploadIcon size={15} />{R.importAction}
            </Link>
            <button className="btn btn-ghost" onClick={() => h.setShowNewCol(true)}>
              <PlusIcon size={15} />{R.newCollectionAction}
            </button>
          </>
        )}
      </div>
    </>
  )
}
