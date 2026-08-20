import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon, RefreshIcon, UploadIcon, ArrowRIcon, MoreIcon, TrashIcon, StarIcon } from '../components/Icons'
import FloatingBar from '../components/FloatingBar'
import NotFoundPage from '../components/NotFoundPage'
import { getSubjectStats, getChapterList, loadStarred, loadQuestions, loadProgress, deleteSubject, clearSubjectProgress } from '../quiz/lib/storage'
import { getSubjectDisplayName } from '../quiz/lib/subjectNames'
import { tierCountsForQuestions } from '../quiz/lib/questionStats'
import StructureTree from '../components/StructureTree'
import { useBackButton } from '../lib/useBackButton'
import { useConfirm, ConfirmSheet } from '../components/ConfirmSheet'
import { pressable } from '../lib/a11y'
import { S } from '../lib/strings'
import { buildQuizRoute } from '../quiz/lib/routes'
import { isInWrongBook } from '../quiz/lib/quizEngine'

function questionType(question) {
  return question.type === 'choice' ? 'choice' : 'review'
}

function questionMatchesType(question, type) {
  return type === null || questionType(question) === type
}

function summarizeChapterQuestions(name, questions, progress) {
  let done = 0
  let correct = 0
  let wrong = 0
  let choice = 0
  let review = 0

  for (const question of questions) {
    const status = progress[question.id]?.status || 'todo'
    if (status !== 'todo') done++
    if (status === 'correct') correct++
    if (status === 'wrong') wrong++
    if (questionType(question) === 'choice') choice++
    else review++
  }

  return {
    name,
    total: questions.length,
    done,
    correct,
    wrong,
    choice,
    review,
    accuracy: done > 0 ? correct / done : 0,
    chapterValue: questions[0]?.chapter || '',
  }
}

function treeTypeLabel(type, count) {
  return type === 'choice'
    ? S.setDetail.choiceTreeLabel(count)
    : S.setDetail.reviewTreeLabel(count)
}

function makeTreeScopeNode({ id, label, questions, progress, chapter, section }) {
  const byType = new Map()
  for (const question of questions) {
    const type = questionType(question)
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type).push(question)
  }

  const typeLeaves = ['choice', 'review']
    .filter(type => byType.has(type))
    .map(type => {
      const typeQuestions = byType.get(type)
      return {
        id: `${id}::${type}`,
        label: treeTypeLabel(type, typeQuestions.length),
        count: typeQuestions.length,
        tiers: tierCountsForQuestions(typeQuestions, progress),
        chapter,
        section,
        quizType: type,
      }
    })

  if (typeLeaves.length === 1) {
    // A homogeneous scope can stay compact, but the leaf still carries the
    // route kind so it cannot accidentally enter the other quiz flow.
    return {
      ...typeLeaves[0],
      id,
      label,
    }
  }

  return {
    id,
    label,
    count: questions.length,
    tiers: tierCountsForQuestions(questions, progress),
    chapter,
    section,
    children: typeLeaves,
  }
}

/**
 * Build the structure tree from the exact question scope currently visible
 * in SetDetail. Every leaf has a quizType; mixed chapter/section scopes get
 * one leaf per type instead of silently choosing one route.
 */
export function buildSetDetailTreeNodes(questions, progress) {
  const chapterMap = new Map()
  for (const question of questions) {
    const chapter = question.chapter || ''
    if (!chapterMap.has(chapter)) chapterMap.set(chapter, new Map())
    const sectionMap = chapterMap.get(chapter)
    const section = question.section || ''
    if (!sectionMap.has(section)) sectionMap.set(section, [])
    sectionMap.get(section).push(question)
  }

  return [...chapterMap.entries()].map(([chapter, sectionMap]) => {
    const chapterLabel = chapter || S.setDetail.uncategorized
    const chapterQuestions = [...sectionMap.values()].flat()
    const sectionNodes = [...sectionMap.entries()]
      .filter(([section]) => section !== '')
      .map(([section, sectionQuestions]) => makeTreeScopeNode({
        id: `${chapter}::${section}`,
        label: section,
        questions: sectionQuestions,
        progress,
        chapter,
        section,
      }))
    const uncategorizedQuestions = sectionMap.get('') || []

    if (uncategorizedQuestions.length === 0) {
      return {
        id: chapter,
        label: chapterLabel,
        count: chapterQuestions.length,
        tiers: tierCountsForQuestions(chapterQuestions, progress),
        chapter,
        section: '',
        children: sectionNodes,
      }
    }

    if (sectionNodes.length === 0) {
      return makeTreeScopeNode({
        id: chapter,
        label: chapterLabel,
        questions: uncategorizedQuestions,
        progress,
        chapter,
        section: '',
      })
    }

    sectionNodes.unshift(makeTreeScopeNode({
      id: `${chapter}::`,
      label: S.setDetail.uncategorized,
      questions: uncategorizedQuestions,
      progress,
      chapter,
      section: '',
    }))

    return {
      id: chapter,
      label: chapterLabel,
      count: chapterQuestions.length,
      tiers: tierCountsForQuestions(chapterQuestions, progress),
      chapter,
      section: '',
      children: sectionNodes,
    }
  })
}

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
      navigate('/?tab=quiz')
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
  const progress = loadProgress()
  const filterType = filter === 'choice' || filter === 'review' ? filter : null
  const visibleQuestions = questions.filter(question => questionMatchesType(question, filterType))

  const subjectName = getSubjectDisplayName(subject)
  const typeCounts = { choice: 0, review: 0 }
  for (const ch of chapters) {
    typeCounts.choice += ch.choice
    typeCounts.review += ch.review
  }

  const starredCount = questions.filter(q => starredIds.has(q.id)).length
  const starredByChapter = visibleQuestions.reduce((map, q) => {
    if (starredIds.has(q.id)) map[q.chapter || S.setDetail.uncategorized] = (map[q.chapter || S.setDetail.uncategorized] || 0) + 1
    return map
  }, {})

  const wrongBookCount = questions.filter(q => isInWrongBook(progress[q.id])).length
  const treeNodes = buildSetDetailTreeNodes(visibleQuestions, progress)

  const questionsByChapter = new Map()
  const chapterRouteValues = new Map()
  for (const question of visibleQuestions) {
    const chapter = question.chapter || S.setDetail.uncategorized
    if (!questionsByChapter.has(chapter)) questionsByChapter.set(chapter, [])
    questionsByChapter.get(chapter).push(question)
  }
  for (const question of questions) {
    const chapter = question.chapter || S.setDetail.uncategorized
    if (!chapterRouteValues.has(chapter)) chapterRouteValues.set(chapter, question.chapter || '')
  }
  const listChapters = chapters.map(ch => ({
    ...ch,
    // Keep the raw storage value for the route. The display label "未分类"
    // must never become a query constraint for an empty chapter.
    chapterValue: chapterRouteValues.has(ch.name) ? chapterRouteValues.get(ch.name) : ch.name,
  }))
  const filteredChapters = filterType
    ? listChapters
      .map(ch => {
        const chapterQuestions = questionsByChapter.get(ch.name) || []
        return chapterQuestions.length > 0
          ? summarizeChapterQuestions(ch.name, chapterQuestions, progress)
          : null
      })
      .filter(Boolean)
    : listChapters

  const accuracy = stats.done > 0 ? Math.round((stats.done - stats.wrong) / stats.done * 100) : 0
  const importRoute = '/import?tab=json'
  const returnTo = `/set/${encodeURIComponent(subject)}`
  const importState = { returnTo }

  if (!subject) {
    return <NotFoundPage title={S.setDetail.notFound} />
  }

  return (
      <div className="page-fill">
      {/* Header */}
      <header className="topbar" style={showMenu ? { zIndex: 50 } : undefined}>
        <button onClick={goBack} className="tb-btn" aria-label={S.common.back}><BackIcon /></button>
        <h1 className="zh" style={{ flex: 1, paddingLeft: 4 }}>{subjectName}</h1>
        <div className="tb-actions">
          <div className="relative">
            <button onClick={() => setShowMenu(o => !o)} className="tb-btn"
              aria-label={S.common.moreActions} aria-haspopup="menu" aria-expanded={showMenu}>
              <MoreIcon />
            </button>
            {showMenu && (
              <>
                <div className="absolute right-0 top-9 z-20 min-w-[176px] rounded-md bg-bg-card border border-border-soft overflow-hidden"
                  role="menu"
                  style={{ border: '1px solid var(--border-soft)' }}>
                  <Link to={importRoute} state={importState} onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <UploadIcon size={15} /> {S.setDetail.importAction}
                  </Link>
                  {starredCount > 0 && (
                    <Link to={`/starred?subject=${encodeURIComponent(subject)}`} onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                      <StarIcon size={15} /> {S.setDetail.starredAction}
                    </Link>
                  )}
                  <button onClick={handleResetProgress}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-ink-2 hover:bg-bg-raised hover:text-ink transition-colors" role="menuitem">
                    <RefreshIcon size={15} /> {S.setDetail.resetProgressAction}
                  </button>
                  <button onClick={handleDeleteSubject}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-md font-body text-danger hover:bg-bg-raised transition-colors" role="menuitem">
                    <TrashIcon size={15} /> {S.setDetail.deleteSubjectAction}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {showMenu && (
        <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowMenu(false)} aria-label={S.setDetail.closeMenu} />
      )}

      <main className="flex-1 overflow-y-auto" inert={showMenu ? '' : undefined}>
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
              <div className="bar" style={{ transform: `scaleX(${(accuracy || 0) / 100})` }} />
            </div>
            <div className="dd-progress-row">
              <span>{S.setDetail.accuracyLabel}</span>
              <span>{accuracy}%</span>
            </div>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ padding: '10px 0 0' }}>
          <div className="filters">
            <button onClick={() => setFilter('all')} className={`chip ${filter === 'all' ? 'on' : ''}`} aria-pressed={filter === 'all'}>
              {S.setDetail.allFilterPrefix}{stats.total}
            </button>
            {typeCounts.choice > 0 && (
              <button onClick={() => setFilter('choice')} className={`chip ${filter === 'choice' ? 'on' : ''}`} aria-pressed={filter === 'choice'}>
                {S.setDetail.choiceFilterPrefix}{typeCounts.choice}
              </button>
            )}
            {typeCounts.review > 0 && (
              <button onClick={() => setFilter('review')} className={`chip ${filter === 'review' ? 'on' : ''}`} aria-pressed={filter === 'review'}>
                {S.setDetail.reviewFilterPrefix}{typeCounts.review}
              </button>
            )}
          </div>
        </div>

        {/* View toggle */}
        <div style={{ padding: '6px 18px' }}>
          <div className="seg" style={{ maxWidth: 160 }}>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'on' : ''} aria-pressed={viewMode === 'list'}>{S.setDetail.listView}</button>
            <button onClick={() => setViewMode('tree')} className={viewMode === 'tree' ? 'on' : ''} aria-pressed={viewMode === 'tree'}>{S.setDetail.treeView}</button>
          </div>
        </div>

        {/* Chapter list with questions */}
        <div style={{ padding: '8px 0 24px' }}>
          {viewMode === 'tree' ? (
            <div className="mx-[18px]">
              <StructureTree
                nodes={treeNodes}
                onLeafTap={(node) => {
                  navigate(buildQuizRoute(node.quizType === 'choice' ? 'quiz' : 'quiz-review', subject, {
                    chapter: node.chapter,
                    section: node.section,
                  }))
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
                    {...pressable(() => setExpandedChapter(isOpen ? null : ch.name))}
                    style={{ fontWeight: 500 }}>
                    <span className={`ch-caret ${isOpen ? 'open' : ''}`} style={{ position: 'absolute', left: 8 }}>›</span>
                    <span className="front" style={{ fontWeight: 500, paddingLeft: 8 }}>{ch.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', color: 'var(--ink-3)' }}>
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
                        <Link to={buildQuizRoute('quiz', subject, { chapter: ch.chapterValue ?? ch.name })}
                          className="card-row">
                          <span className="q-tag-mini choice">{S.setDetail.choiceTagMini}</span>
                          <span className="front" style={{ fontSize: 'var(--text-md)' }}>{S.setDetail.choiceLabelWithCount(ch.choice)}</span>
                          <ArrowRIcon size={12} style={{ color: 'var(--ink-3)' }} />
                        </Link>
                      )}
                      {ch.review > 0 && (
                        <Link to={buildQuizRoute('quiz-review', subject, { chapter: ch.chapterValue ?? ch.name })}
                          className="card-row">
                          <span className="q-tag-mini review">{S.setDetail.reviewTagMini}</span>
                          <span className="front" style={{ fontSize: 'var(--text-md)' }}>{S.setDetail.reviewLabelWithCount(ch.review)}</span>
                          <ArrowRIcon size={12} style={{ color: 'var(--ink-3)' }} />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredChapters.length === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 'var(--text-md)' }}>
                {S.setDetail.emptyChapters}
              </div>
            )}
          </div>
          )}
        </div>
      </main>

      {/* Floating action bar */}
      <FloatingBar inert={showMenu ? '' : undefined}>
        <div className="dd-cta" style={{ margin: 0 }}>
          {typeCounts.choice > 0 ? (
            <button className="dd-cta-main" onClick={() => navigate(buildQuizRoute('quiz', subject))}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.choice}</span>{S.setDetail.countSuffix}</span>
                <span className="sub">{S.setDetail.beginChoiceLabel}</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : typeCounts.review > 0 ? (
            <button className="dd-cta-main" onClick={() => navigate(buildQuizRoute('quiz-review', subject))}>
              <div className="left">
                <span className="lead"><span className="num">{typeCounts.review}</span>{S.setDetail.countSuffix}</span>
                <span className="sub">{S.setDetail.beginReviewLabel}</span>
              </div>
              <span className="arr">→</span>
            </button>
          ) : (
            <Link to={importRoute} state={importState} className="dd-cta-main">
              <div className="left">
                <span className="lead">{S.setDetail.importQuestionsLabel}</span>
                <span className="sub">{S.setDetail.importFirstLabel}</span>
              </div>
              <span className="arr">→</span>
            </Link>
          )}
        </div>
        {wrongBookCount > 0 && (
          <Link to={`/wrong?subject=${encodeURIComponent(subject)}`} className="dd-action dd-action-wide">
            <RefreshIcon size={18} /><span className="lab">{S.setDetail.wrongAction(wrongBookCount)}</span>
          </Link>
        )}
      </FloatingBar>
      <ConfirmSheet state={confirmState} />
    </div>
  )
}
