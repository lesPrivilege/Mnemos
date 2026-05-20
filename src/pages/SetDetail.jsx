import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon, RefreshIcon, UploadIcon, ArrowRIcon, MoreIcon, TrashIcon, StarIcon } from '../components/Icons'
import { getSubjectStats, getChapterList, loadStarred, loadQuestions, deleteSubject, clearSubjectProgress } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { SUBJECT_HUE, SUBJECT_GLYPH } from '../quiz/lib/subjectMeta'
import { useBackButton } from '../lib/useBackButton'

export default function SetDetail() {
  const { subject } = useParams()
  const navigate = useNavigate()
  const { goBack } = useBackButton()
  const [filter, setFilter] = useState('all')
  const [expandedChapter, setExpandedChapter] = useState(null)
  const [showMenu, setShowMenu] = useState(false)

  const handleDeleteSubject = () => {
    setShowMenu(false)
    if (confirm(`删除科目「${getSubjectDisplayName(subject)}」及其全部题目与进度？此操作不可撤销。`)) {
      deleteSubject(subject)
      navigate('/')
    }
  }

  const handleResetProgress = () => {
    setShowMenu(false)
    if (confirm(`重置「${getSubjectDisplayName(subject)}」的练习进度？已收藏的题目会保留。`)) {
      clearSubjectProgress(subject)
    }
  }

  const stats = getSubjectStats(subject)
  const chapters = getChapterList(subject)
  const questions = loadQuestions().filter(q => q.subject === subject)
  const starredIds = new Set(loadStarred())

  const subjectName = getSubjectDisplayName(subject)
  const hue = SUBJECT_HUE[subject] || 0
  const glyph = SUBJECT_GLYPH[subject] || '学'

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
    if (starredIds.has(q.id)) map[q.chapter || '未分类'] = (map[q.chapter || '未分类'] || 0) + 1
    return map
  }, {})

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
                    <RefreshIcon size={15} /> 重置进度
                  </button>
                  <button onClick={handleDeleteSubject}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> 删除科目
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Stats section */}
        <div style={{ padding: '14px 0 0' }}>
          <div className="dd-head">
            <div className="dd-meta">
              <span>{stats.total} 题</span><span className="sep">/</span>
              {typeCounts.choice > 0 && <><span>选择 {typeCounts.choice}</span><span className="sep">/</span></>}
              {typeCounts.review > 0 && <><span>解答 {typeCounts.review}</span><span className="sep">/</span></>}
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
              全部 · {stats.total}
            </button>
            {typeCounts.choice > 0 && (
              <button onClick={() => setFilter('choice')} className={`chip ${filter === 'choice' ? 'on' : ''}`}>
                选择 · {typeCounts.choice}
              </button>
            )}
            {typeCounts.review > 0 && (
              <button onClick={() => setFilter('review')} className={`chip ${filter === 'review' ? 'on' : ''}`}>
                解答 · {typeCounts.review}
              </button>
            )}
            <button onClick={() => setFilter('starred')} className={`chip ${filter === 'starred' ? 'on' : ''}`}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.7 5.9 6.3.6-4.8 4.5 1.5 6.5L12 17l-5.7 3.5 1.5-6.5L3 9.5l6.3-.6z" /></svg>
              收藏 · {starredCount}
            </button>
          </div>
        </div>

        {/* Chapter list with questions */}
        <div style={{ padding: '8px 0 24px' }}>
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
                      {ch.total}题
                      {ch.choice > 0 && <span style={{ marginLeft: 6 }}>选{ch.choice}</span>}
                      {ch.review > 0 && <span style={{ marginLeft: 6 }}>答{ch.review}</span>}
                      {ch.wrong > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{ch.wrong}错</span>}
                      {chStarred > 0 && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>{chStarred}★</span>}
                    </span>
                  </div>
                  {isOpen && (
                    <div style={{ paddingLeft: 16 }}>
                      {ch.choice > 0 && (
                        <Link to={`/quiz/${subject}?chapter=${encodeURIComponent(ch.name)}`}
                          className="card-row">
                          <span className="q-tag-mini choice">选</span>
                          <span className="front" style={{ fontSize: 13 }}>选择题 ({ch.choice}题)</span>
                          <ArrowRIcon size={12} style={{ color: 'var(--ink-3)' }} />
                        </Link>
                      )}
                      {ch.review > 0 && (
                        <Link to={`/quiz-review/${subject}?chapter=${encodeURIComponent(ch.name)}`}
                          className="card-row">
                          <span className="q-tag-mini review">答</span>
                          <span className="front" style={{ fontSize: 13 }}>解答题 ({ch.review}题)</span>
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
                {filter === 'starred' ? '暂无收藏章节' : '暂无章节数据'}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed bottom bar */}
      <div className="flex-shrink-0 px-[18px] pb-[14px] flex flex-col gap-2" style={{ background: 'var(--bg)' }}>
        <div className="dd-cta" style={{ margin: 0 }}>
          {typeCounts.choice > 0 ? (
            <button className="dd-cta-main teal" onClick={() => navigate(`/quiz/${subject}`)}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.choice + typeCounts.review}</span>题</span>
                <span className="sub">BEGIN · 开始练习</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : typeCounts.review > 0 ? (
            <button className="dd-cta-main teal" onClick={() => navigate(`/quiz-review/${subject}`)}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.review}</span>题</span>
                <span className="sub">BEGIN · 开始练习</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : (
            <div className="dd-cta-main teal" style={{ opacity: 0.5, cursor: 'default' }}>
              <div className="left">
                <span className="lead">暂无题目</span>
                <span className="sub">IMPORT · 请先导入</span>
              </div>
            </div>
          )}
        </div>
        <div className="dd-secondary" style={{ margin: 0 }}>
          <Link to={`/wrong?subject=${subject}`} className="dd-action">
            <RefreshIcon size={18} /><span className="lab">错题</span>
          </Link>
          <Link to={`/starred?subject=${subject}`} className="dd-action">
            <StarIcon size={18} /><span className="lab">收藏</span>
          </Link>
          <Link to="/import?tab=json" className="dd-action"><UploadIcon size={18} /><span className="lab">导入</span></Link>
        </div>
      </div>
    </div>
  )
}
