// Shared body for ReadingHome and ReadingHomeContent
// Accepts h (useReadingHome return) as props so both wrappers share one hook instance
import { useNavigate, Link } from 'react-router-dom'
import { getDocumentsByCollection, toggleCollectionPin } from '../lib/storage'
import { getWeeklyMinutes } from '../lib/stats'
import { PlusIcon, TrashIcon, UploadIcon, LayersIcon, SparkIcon, PinIcon } from '../../components/Icons'
import { HeroSection } from '../../components/HeroSection'
import EmptyState from '../../components/EmptyState'

export default function ReadingHomeBody({ h }) {
  const navigate = useNavigate()
  const docCount = h.collections.reduce((sum, c) => sum + getDocumentsByCollection(c.id).length, 0)
  const isEmptyLibrary = h.collections.length === 0

  return (
    <>
      {/* Search results */}
      {h.query.trim() && (
        h.searchResults.length === 0 ? (
          <div className="text-center text-ink-3 py-6 font-zh text-sm">没有匹配的文档</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="section-title">搜索结果</div>
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
                label={isEmptyLibrary ? '准备 · READY' : '本周 · THIS WEEK'}
                right={isEmptyLibrary
                  ? [{ icon: <UploadIcon size={14} />, text: '待导入' }]
                  : [{ icon: <SparkIcon size={14} />, text: `${weekly.totalThisWeek} 分钟`, warn: true }]}
                metrics={isEmptyLibrary
                  ? [
                      { value: h.collections.length, label: 'COLS', zhLabel: '集合', accent: true },
                      { value: weekly.totalThisWeek, label: 'MIN', zhLabel: '分钟' },
                      { value: docCount, label: 'DOCS', zhLabel: '文档' },
                    ]
                  : [
                      { value: weekly.totalThisWeek, label: 'MIN', zhLabel: '分钟', accent: true },
                      { value: h.stats.docsCompleted, label: 'DONE', zhLabel: '完成' },
                      { value: docCount, label: 'DOCS', zhLabel: '文档' },
                    ]}
                chartData={weekly.chart}
                chartColor="teal"
                chartMax={maxCount}
                to="/activity"
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
                  <span className="due">继续阅读</span>
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
            <div className="section-title">集合 · COLLECTIONS</div>
            <span className="count">{h.collections.length}</span>
          </div>

          {h.collections.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="seg" style={{ display: 'inline-flex', width: 'auto' }}>
                {[{ key: 'created', label: '创建' }, { key: 'recent', label: '最近' }].map(s => (
                  <button key={s.key} onClick={() => h.setSortBy(s.key)} className={h.sortBy === s.key ? 'on' : ''}>{s.label}</button>
                ))}
              </div>
            </div>
          )}

          {h.sorted.length === 0 && !h.showNewCol && (
            <EmptyState
              icon={<LayersIcon size={48} />}
              title="还没有阅读集合"
              hint="导入或新建集合即可开始阅读"
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
                    <span>{docs.length} 篇文档</span>
                  </div>
                </div>
                <div className="deck-cta" style={{ gap: 6 }}>
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 opacity-40 hover:opacity-100 hover:text-accent hover:bg-accent-soft transition-colors flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); toggleCollectionPin(col.id); h.refresh() }}
                    title={col.pinned ? '取消置顶' : '置顶集合'}
                    aria-label={col.pinned ? '取消置顶' : '置顶集合'}>
                    <PinIcon size={15} filled={col.pinned} />
                  </button>
                  <button
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 opacity-40 hover:opacity-100 hover:text-danger hover:bg-danger-soft transition-colors flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); h.handleDeleteCollection(col.id, col.name) }}
                    title="删除集合">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                    </svg>
                  </button>
                  {docs.length > 0 && (
                    <button className="cta-pill" onClick={(e) => {
                      e.stopPropagation()
                      navigate(lastDoc?.lastReadAt ? `/reading/doc/${lastDoc.id}?col=${col.id}` : `/collection/${col.id}`)
                    }}>
                      阅读<span className="arr">→</span>
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
              <div className="font-mono text-[10px] text-ink-3 tracking-wider uppercase">新建文档</div>
              <input value={h.newDocTitle} onChange={e => h.setNewDocTitle(e.target.value)}
                placeholder="文档标题" autoFocus
                className="w-full py-[9px] px-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent"
                style={{ borderColor: 'var(--border)' }} />
              <textarea value={h.newDocContent} onChange={e => h.setNewDocContent(e.target.value)}
                placeholder="文档内容（Markdown）" rows={8}
                className="w-full p-3 rounded-md border bg-bg text-ink font-zh text-sm outline-none focus:border-accent resize-none"
                style={{ borderColor: 'var(--border)' }} />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => h.setShowNewDoc(null)}
                  className="btn btn-ghost">取消</button>
                <button type="submit" disabled={!h.newDocTitle.trim() || !h.newDocContent.trim()}
                  className="btn btn-primary disabled:opacity-40">创建</button>
              </div>
            </form>
          )}

        </>
      )}

      {/* Bottom actions */}
      <div className="bottom-actions">
        {h.showNewCol ? (
          <form onSubmit={h.handleAddCollection} className="col-span-2 flex gap-2">
            <input value={h.newColName} onChange={e => h.setNewColName(e.target.value)} placeholder="集合名称" autoFocus
              className="flex-1 px-3 py-2.5 rounded-md border bg-bg-card text-ink font-zh text-sm outline-none focus:border-accent"
              style={{ borderColor: 'var(--border)' }} />
            <button type="submit" disabled={!h.newColName.trim()}
              className="px-4 py-2.5 rounded-md font-medium text-sm font-body bg-ink text-bg active:scale-[0.97] transition-transform disabled:opacity-40">
              创建
            </button>
            <button type="button" onClick={() => { h.setShowNewCol(false); h.setNewColName('') }}
              className="px-4 py-2.5 rounded-md font-body text-sm border text-ink-2 active:scale-[0.97] transition-transform"
              style={{ borderColor: 'var(--border)' }}>
              取消
            </button>
          </form>
        ) : (
          <>
            <Link to="/import?tab=reading" className="btn btn-ghost">
              <UploadIcon size={16} /> 导入
            </Link>
            <button onClick={() => h.setShowNewCol(true)} className="btn btn-primary">
              <PlusIcon size={16} /> 新建集合
            </button>
          </>
        )}
      </div>

    </>
  )
}
