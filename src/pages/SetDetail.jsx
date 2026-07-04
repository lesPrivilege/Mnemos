import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon, RefreshIcon, UploadIcon, ArrowRIcon, MoreIcon, TrashIcon, StarIcon } from '../components/Icons'
import FloatingBar from '../components/FloatingBar'
import { getSubjectStats, getChapterList, loadStarred, loadQuestions, loadProgress, deleteSubject, clearSubjectProgress } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { tierCountsForQuestions } from '../quiz/lib/questionStats'
import StructureTree from '../components/StructureTree'
import { useBackButton } from '../lib/useBackButton'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { S } from '../lib/strings'

export default function SetDetail() {
  const { subject } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const { confirmState, confirm } = useConfirm()
  const [filter, setFilter] = useState('all')
  const [expandedChapter, setExpandedChapter] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [viewMode, setViewMode] = useState('list')

  const handleDeleteSubject = async () => {
    setShowMenu(false)
    const ok = await confirm({ title: S.setDetail.deleteSubjectTitle, message: S.setDetail.deleteSubjectMessage(getSubjectDisplayName(subject)), confirmLabel: S.setDetail.confirmDelete })
    if (ok) {
      deleteSubject(subject)
      navigate('/')
    }
  }

  const handleResetProgress = async () => {
    setShowMenu(false)
    const ok = await confirm({ title: S.setDetail.resetProgressTitle, message: S.setDetail.resetProgressMessage(getSubjectDisplayName(subject)), confirmLabel: S.setDetail.confirmReset, destructive: false })
    if (ok) {
      clearSubjectProgress(subject)
    }
  }

  const stats = getSubjectStats(subject)
  const chapters = getChapterList(subject)
  const questions = loadQuestions().filter(q => q.subject === subject)
  const starredIds = new Set(loadStarred())

  const subjectName = getSubjectDisplayName(subject)
  const typeCounts = { choice: 0, review: 0 }
  for (const ch of chapters) {
    typeCounts.choice += ch.choice
    typeCounts.review += ch.review
  }

  const starredChapterNames = new Set(
    questions.filter(q => starredIds.has(q.id) && q.chapter).map(q => q.chapter)
  )
  const starredCount = questions.filter(q => starredIds.has(q.id)).length
  const starredByChapter = questions.reduce((map, q) => {
    if (starredIds.has(q.id)) map[q.chapter || S.setDetail.uncategorized] = (map[q.chapter || S.setDetail.uncategorized] || 0) + 1
    return map
  }, {})

  // Build tree nodes for structure view
  const progress = loadProgress()
  const treeNodes = (() => {
    const chapterMap = new Map()
    for (const q of questions) {
      const ch = q.chapter || S.setDetail.uncategorized
      if (!chapterMap.has(ch)) chapterMap.set(ch, new Map())
      const secMap = chapterMap.get(ch)
      const sec = q.section || ''
      if (!secMap.has(sec)) secMap.set(sec, [])
      secMap.get(sec).push(q)
    }
    return [...chapterMap.entries()].map(([ch, secMap]) => {
      const chQs = [...secMap.values()].flat()
      const chTiers = tierCountsForQuestions(chQs, progress)
      const children = [...secMap.entries()]
        .filter(([sec]) => sec !== '')
        .map(([sec, secQs]) => ({
          id: `${ch}::${sec}`,
          label: sec,
          count: secQs.length,
          tiers: tierCountsForQuestions(secQs, progress),
          chapter: ch,
          section: sec,
        }))
      const noSecQs = secMap.get('') || []
      if (noSecQs.length > 0 && children.length === 0) {
        return { id: ch, label: ch, count: chQs.length, tiers: chTiers, chapter: ch, section: '' }
      }
      if (noSecQs.length > 0) {
        children.unshift({ id: `${ch}::`, label: S.setDetail.uncategorized, count: noSecQs.length, tiers: tierCountsForQuestions(noSecQs, progress), chapter: ch, section: '' })
      }
      return { id: ch, label: ch, count: chQs.length, tiers: chTiers, children }
    })
  })()

  const filteredChapters = chapters.filter(ch => {
    if (filter === 'choice') return ch.choice > 0
    if (filter === 'review') return ch.review > 0
    if (filter === 'starred') return starredChapterNames.has(ch.name)
    return true
  })

  const accuracy = stats.done > 0 ? Math.round((stats.done - stats.wrong) / stats.done * 100) : 0

  if (!subject) {
    return (
      <div className="page-fill items-center justify-center text-ink-2">
        Subject not found
      </div>
    )
  }

  return (
      <div className="page-fill">
      {/* Header */}
      <header className="topbar">
        <button onClick={goBack} className="tb-btn"><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{subjectName}</h1>
        <div className="tb-actions">
          <div className="relative">
            <button onClick={() => setShowMenu(o => !o)} className="tb-btn"
              aria-haspopup="menu" aria-expanded={showMenu}>
              <MoreIcon />
            </button>
            {showMenu && (
              <>
                <button className="fixed inset-0 z-10 cursor-default" onClick={() => setShowMenu(false)} aria-label="Close menu" />
                <div className="absolute right-0 top-9 z-20 min-w-[176px] rounded-md bg-bg-card shadow-lg overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <button onClick={handleResetProgress}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <RefreshIcon size={15} /> {S.setDetail.resetProgressAction}
                  </button>
                  <button onClick={handleDeleteSubject}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> {S.setDetail.deleteSubjectAction}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 140 }}>
        {/* Stats section */}
        <div style={{ padding: '14px 0 0' }}>
          <div className="dd-head">
            <div className="dd-meta">
              <span>{stats.total}{S.setDetail.totalSuffix}</span><span className="sep">/</span>
              {typeCounts.choice > 0 && <><span>{S.setDetail.choicePrefix}{typeCounts.choice}</span><span className="sep">/</span></>}
              {typeCounts.review > 0 && <><span>{S.setDetail.reviewPrefix}{typeCounts.review}</span><span className="sep">/</span></>}
              <span style={{ color: accuracy < 60 ? 'var(--danger)' : 'var(--good)' }}>{accuracy}%</span>
            </div>
            <div className="dd-progress">
              <div className="bar teal" style={{ width: `${accuracy}%` }} />
            </div>
            <div className="dd-progress-row">
              <span>ACCURACY</span>
              <span>{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '10px 0 0' }}>
          <div className="filters">
            <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'on' : ''}`}>
              {S.setDetail.allFilterPrefix}{stats.total}
            </button>
            {typeCounts.choice > 0 && (
              <button onClick={() => setFilter('choice')} className={`chip ${filter === 'choice' ? 'on' : ''}`}>
                {S.setDetail.choiceFilterPrefix}{typeCounts.choice}
              </button>
            )}
            {typeCounts.review > 0 && (
              <button onClick={() => setFilter('review')} className={`chip ${filter === 'review' ? 'on' : ''}`}>
                {S.setDetail.reviewFilterPrefix}{typeCounts.review}
              </button>
            )}
            <button onClick={() => setFilter('starred')} className={`chip ${filter === 'starred' ? 'on' : ''}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
              {S.setDetail.starredFilterPrefix}{starredCount}
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ padding: '6px 18px' }}>
          <div className="seg" style={{ maxWidth: 160 }}>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'on' : ''}>{S.setDetail.listView}</button>
            <button onClick={() => setViewMode('tree')} className={viewMode === 'tree' ? 'on' : ''}>{S.setDetail.treeView}</button>
          </div>
        </div>

        {/* Chapter list with questions */}
        <div style={{ padding: '8px 0 24px' }}>
          {viewMode === 'tree' ? (
            <div className="mx-[18px]">
              <StructureTree
                nodes={treeNodes}
                onLeafTap={(node) => {
                  const params = new URLSearchParams()
                  if (node.chapter) params.set('chapter', node.chapter)
                  if (node.section) params.set('section', node.section)
                  const qs = params.toString()
                  const base = typeCounts.choice > 0 ? `/quiz/${subject}` : `/quiz-review/${subject}`
                  navigate(`${base}?${qs}`)
                }}
              />
            </div>
          ) : (
          <div className="card-list">
            {filteredChapters.map(ch => {
              const isOpen = expandedChapter === ch.name
              const chStarred = starredByChapter[ch.name] || 0
              return (
                <div key={ch.name}>
                  <div className="card-row" onClick={() => setExpandedChapter(isOpen ? null : ch.name)}
                    style={{ fontWeight: 500 }}>
                    <span className={`ch-caret ${isOpen ? 'open' : ''}`} style={{ position: 'absolute', left: 8 }}>›</span>
                    <span className="front" style={{ fontWeight: 500, paddingLeft: 8 }}>{ch.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                      {ch.total}{S.setDetail.countSuffix}
                      {ch.choice > 0 && <span style={{ marginLeft: 6 }}>{S.setDetail.choicePrefixShort}{ch.choice}</span>}
                      {ch.review > 0 && <span style={{ marginLeft: 6 }}>{S.setDetail.reviewPrefixShort}{ch.review}</span>}
                      {ch.wrong > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{ch.wrong}{S.setDetail.wrongSuffix}</span>}
                      {chStarred > 0 && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{chStarred}★</span>}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ paddingLeft: 16 }}>
                      {ch.choice > 0 && (
                        <Link to={`/quiz/${subject}?chapter=${encodeURIComponent(ch.name)}`}
                          className="card-row">
                          <span className="q-tag-mini choice">{S.setDetail.choiceTagMini}</span>
                          <span className="front" style={{ fontSize: 13 }}>{S.setDetail.choiceLabelWithCount(ch.choice)}</span>
                          <ArrowRIcon size={12} style={{ color: 'var(--ink-3)' }} />
                        </Link>
                      )}
                      {ch.review > 0 && (
                        <Link to={`/quiz-review/${subject}?chapter=${encodeURIComponent(ch.name)}`}
                          className="card-row">
                          <span className="q-tag-mini review">{S.setDetail.reviewTagMini}</span>
                          <span className="front" style={{ fontSize: 13 }}>{S.setDetail.reviewLabelWithCount(ch.review)}</span>
                          <ArrowRIcon size={12} style={{ color: 'var(--ink-3)' }} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredChapters.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                {filter === 'starred' ? S.setDetail.emptyStarredChapters : S.setDetail.emptyChapters}
              </div>
            )}
          </div>
          )}
        </div>
      </main>

      {/* Floating action bar */}
      <FloatingBar>
        <div className="dd-cta" style={{ margin: 0 }}>
          {typeCounts.choice > 0 ? (
            <button className="dd-cta-main teal" onClick={() => navigate(`/quiz/${subject}`)}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.choice + typeCounts.review}</span>{S.setDetail.countSuffix}</span>
                <span className="sub">{S.setDetail.beginPracticeLabel}</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : typeCounts.review > 0 ? (
            <button className="dd-cta-main teal" onClick={() => navigate(`/quiz-review/${subject}`)}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.review}</span>{S.setDetail.countSuffix}</span>
                <span className="sub">{S.setDetail.beginPracticeLabel}</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : (
            <div className="dd-cta-main teal" style={{ opacity: 0.5, cursor: 'default' }}>
              <div className="left">
                <span className="lead">{S.setDetail.noQuestions}</span>
                <span className="sub">{S.setDetail.importFirstLabel}</span>
              </div>
            </div>
          )}
        </div>
        <div className="dd-secondary" style={{ margin: 0 }}>
          <Link to={`/wrong?subject=${subject}`} className="dd-action">
            <RefreshIcon size={18} /><span className="lab">{S.setDetail.wrongAction}</span>
          </Link>
          <Link to={`/starred?subject=${subject}`} className="dd-action">
            <StarIcon size={18} /><span className="lab">{S.setDetail.starredAction}</span>
          </Link>
          <Link to="/import?tab=json" className="dd-action"><UploadIcon size={18} /><span className="lab">{S.setDetail.importAction}</span></Link>
        </div>
      </FloatingBar>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
