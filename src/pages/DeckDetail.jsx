import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import CardEditor from '../components/CardEditor'
import { BackIcon, PinIcon, MoreIcon, LayersIcon, SparkIcon, UploadIcon, PlusIcon, SearchIcon, EditIcon, TrashIcon, DownloadIcon, RefreshIcon } from '../components/Icons'
import FloatingBar from '../components/FloatingBar'
import { isRecall } from '../lib/cardUtils'
import { mastery, masteryTier, tierCounts } from '../lib/cardStats'
import StructureTree from '../components/StructureTree'
import { localToday } from '../lib/dateUtils'
import { getDeck, getCards, addCard, updateCard, updateDeck, deleteCard, deleteCards, deleteDeck, togglePin, toggleStar, exportDeck, resetDeckProgress } from '../lib/storage'
import { useBackButton } from '../lib/useBackButton'
import { useRenderedMarkdown } from '../lib/useRenderedMarkdown'
import { downloadBlob } from '../lib/utils'
import { useToast, Toast } from '../components/Toast'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import '../styles/markdown.css'

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
  const { toast, showToast } = useToast()
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
    const ok = await confirm({ title: '重置进度', message: `重置「${deck.name}」的学习进度？已收藏的卡片会保留。`, confirmLabel: '确认重置', destructive: false })
    if (!ok) return
    resetDeckProgress(id)
    refresh()
  }

  const handleDeleteDeck = async () => {
    const ok = await confirm({ title: '删除卡组', message: '删除此卡组及其所有卡片？此操作不可撤销。', confirmLabel: '确认删除' })
    if (!ok) return
    deleteDeck(id)
    navigate('/')
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
    const ok = await confirm({ title: '批量删除', message: `删除 ${selected.size} 张卡片？此操作不可撤销。`, confirmLabel: '确认删除' })
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
      const ch = card.chapter || '未分类'
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
        children.unshift({ id: `${ch}::`, label: '未分类', count: noSecCards.length, tiers: tierCounts(noSecCards), chapter: ch, section: '' })
      }
      return { id: ch, label: ch, count: chCards.length, tiers: chTiers, children }
    })
  })()

  if (!deck) {
    return (
      <div className="page-fill items-center justify-center text-ink-2">
        Deck not found
      </div>
    )
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
            className="flex-1 font-zh text-[17px] font-medium text-ink bg-transparent border-b border-accent outline-none px-2" />
        ) : (
          <h1 onClick={() => { setEditingName(true); setNameInput(deck.name) }}
            className="flex-1 font-zh text-[17px] font-medium text-ink truncate cursor-pointer hover:text-accent transition-colors pl-1">
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
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowDeckMenu(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-9 z-20 min-w-[168px] rounded-md bg-bg-card shadow-lg overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={() => { setShowDeckMenu(false); setEditingName(true); setNameInput(deck.name) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <EditIcon size={15} /> 重命名卡组
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); togglePin(id); refresh() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <PinIcon size={15} /> {deck.pinned ? '取消置顶' : '置顶卡组'}
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); editing ? exitEdit() : setEditing(true) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <EditIcon size={15} /> {editing ? '完成编辑' : '批量编辑卡片'}
                  </button>
                  <button onClick={() => {
                    setShowDeckMenu(false)
                    const json = exportDeck(id)
                    if (!json) return
                    const blob = new Blob([json], { type: 'application/json' })
                    downloadBlob(blob, `${deck.name || 'deck'}.json`)
                  }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <DownloadIcon size={15} /> 导出卡组
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); handleResetProgress() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <RefreshIcon size={15} /> 重置进度
                  </button>
                  <button onClick={() => { setShowDeckMenu(false); handleDeleteDeck() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> 删除卡组
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 140 }}>
        {/* Progress section */}
        <div style={{ padding: '14px 0 0' }}>
          <div className="dd-head">
            <div className="dd-meta">
              <span>{total} 张</span><span className="sep">·</span>
              <span style={{ color: 'var(--accent)' }}>{dueCount} 待复习</span><span className="sep">·</span>
              <span>{learned} 已学</span>
              {suspendedCount > 0 && <><span className="sep">·</span><span style={{ color: 'var(--warn, #d97706)' }}>暂停 {suspendedCount}</span></>}
            </div>
            <div className="dd-meta" style={{ marginTop: 4 }}>
              <span className="font-mono text-[10px]" style={{ color: 'var(--danger)' }}>弱 {tiers.weak}</span>
              <span className="sep">·</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--accent)' }}>中 {tiers.mid}</span>
              <span className="sep">·</span>
              <span className="font-mono text-[10px]" style={{ color: 'var(--good)' }}>稳 {tiers.solid}</span>
              {tiers.new > 0 && <><span className="sep">·</span><span className="font-mono text-[10px]" style={{ color: 'var(--ink-3)' }}>新 {tiers.new}</span></>}
            </div>
            <div className="dd-progress">
              <div className="bar" style={{ width: `${total > 0 ? (learned / total) * 100 : 0}%` }} />
            </div>
            <div className="dd-progress-row">
              <span>PROGRESS</span>
              <span>{total > 0 ? Math.round((learned / total) * 100) : 0}%</span>
            </div>
          </div>
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
              全部 · {total}
            </button>
            <button onClick={() => setFilter('starred')} className={`chip ${filter === 'starred' ? 'on' : ''}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
              收藏
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ padding: '6px 18px' }}>
          <div className="seg" style={{ maxWidth: 160 }}>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'on' : ''}>列表</button>
            <button onClick={() => setViewMode('tree')} className={viewMode === 'tree' ? 'on' : ''}>结构</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 0 0' }}>
          <div className="search" style={{ margin: '0 18px' }}>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索卡片..." />
            <SearchIcon size={16} />
          </div>
        </div>

        {/* Card list / outline */}
        <div style={{ padding: '8px 0 24px' }}>
          {viewMode === 'tree' ? (
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
                      className="ch-row">
                      <span className={`ch-caret ${isChapterOpen ? 'open' : ''}`}>›</span>
                      <span className="ch-name">{chapter || '未分类'}</span>
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
                                className="sec-row">
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
                className="flex-1 py-2.5 rounded-md font-body text-sm text-danger border active:scale-[0.97] transition-transform"
                style={{ borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)' }}>
                删除 ({selected.size})
              </button>
            )}
            <button onClick={async () => {
              const ok = await confirm({ title: '全部删除', message: `删除卡组内全部 ${cards.length} 张卡片？此操作不可撤销。`, confirmLabel: '确认删除' })
              if (!ok) return
              deleteCards(cards.map((c) => c.id))
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
      </main>

      {/* Floating action bar */}
      <FloatingBar>
        {/* Primary CTA */}
        <div className="dd-cta" style={{ margin: 0 }}>
          <Link to={`/review/${id}`} className="dd-cta-main">
            <div className="left">
              <span className="lead"><span className="num">{dueCount}</span>张 待复习</span>
              <span className="sub">BEGIN · 开始</span>
            </div>
            <span className="arr">→</span>
          </Link>
        </div>

        {/* Secondary actions */}
        <div className="dd-secondary" style={{ margin: 0 }}>
          <Link to={`/browse/${id}`} className="dd-action">
            <LayersIcon size={18} /><span className="lab">浏览</span>
          </Link>
          <Link to={`/review/${id}?all=true`} className="dd-action">
            <SparkIcon size={18} /><span className="lab">全部复习</span>
          </Link>
          <Link to={`/import?tab=md&deckId=${id}`} className="dd-action">
            <UploadIcon size={18} /><span className="lab">导入</span>
          </Link>
          <button onClick={() => setShowEditor(!showEditor)} className="dd-action">
            <PlusIcon size={18} /><span className="lab">新卡片</span>
          </button>
        </div>
      </FloatingBar>
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setPreviewCard(null)}>
          <div className="bg-bg-card rounded-lg p-5 max-w-sm w-full shadow-lg" style={{ border: '1px solid var(--border-soft)' }} onClick={e => e.stopPropagation()}>
            <div className="font-mono text-[10px] text-ink-3 mb-2 tracking-wider">FRONT</div>
            <div className="font-zh text-[15px] text-ink mb-3 max-h-40 overflow-y-auto"><PreviewContent text={previewCard.front} /></div>
            <div className="font-mono text-[10px] text-ink-3 mb-2 tracking-wider">BACK</div>
            <div className="font-zh text-[14px] card-content max-h-48 overflow-y-auto" style={{ color: 'var(--teal)' }}><PreviewContent text={previewCard.back} /></div>
            <button onClick={() => setPreviewCard(null)} className="mt-4 w-full py-2 rounded-md text-sm font-body text-ink-2 border" style={{ borderColor: 'var(--border)' }}>关闭</button>
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
  const tierColor = card.repetitions === 0 ? 'var(--ink-3)' : tier === 'weak' ? 'var(--danger)' : tier === 'mid' ? 'var(--accent)' : 'var(--good)'

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
      <div onClick={onToggleSelect}
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
        <span className="text-sm text-ink truncate flex-1">{card.front}</span>
        {card.starred && <span className="text-xs shrink-0 text-accent">★</span>}
        {!isRecall(card) && (
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border text-ink-3 shrink-0" style={{ borderColor: 'var(--border)' }}>REF</span>
        )}
      </div>
    )
  }

  return (
      <div className="card-row group" style={{ paddingRight: 12 }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}>
        <span className="dot-bullet" style={{ left: 8 }} />
        {isRecall(card) && (
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tierColor, flexShrink: 0, marginLeft: 2 }} />
        )}
        <span className="front" style={{ fontSize: 13, paddingLeft: isRecall(card) ? 4 : 6 }}>{card.front}</span>
        {card.starred && <span className="star">★</span>}
        {!isRecall(card) && (
          <span className="q-tag-mini">REF</span>
        )}
        <div className="hidden group-hover:flex gap-1 shrink-0 ml-1">
          <button onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="text-[11px] px-1.5 py-0.5 rounded border text-ink-2" style={{ borderColor: 'var(--border)' }}>编辑</button>
          <button onClick={async (e) => { e.stopPropagation(); const ok = await confirm({ title: '删除卡片', message: '删除这张卡片？此操作不可撤销。', confirmLabel: '确认删除' }); if (ok) onDelete() }}
            className="text-[11px] px-1.5 py-0.5 rounded border text-danger" style={{ borderColor: 'color-mix(in oklch, var(--danger) 30%, transparent)' }}>删除</button>
        </div>
      </div>
  )
}
