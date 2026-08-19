import { getAllDeckStats } from '../scheduler'
import { loadReviewSession } from '../reviewSession'
import { loadLastSession, loadQuestions } from '../../quiz/lib/storage'
import { getWrongQuestions } from '../../quiz/lib/quizEngine'
import { getSubjectDisplayName } from '../../quiz/lib/subjectNames'
import { getContinueReading, getDocuments } from '../../reading/lib/storage'

const DONE_READING_PCT = 95

function newestFirst(a, b) {
  return b.timestamp - a.timestamp
}

/**
 * 今日学习路径——跨模块首页的唯一数据契约。
 *
 * 优先序：最近一次中断现场 → 到期复习 → 错题订正 → 未读完文档。
 * 中断现场之间按真实保存时刻排序；页面不再分别读取三套存储再自行裁决。
 */
export function todayJourney() {
  const decks = getAllDeckStats()
  const questions = loadQuestions()
  const documents = getDocuments()
  const dueDecks = decks
    .filter((deck) => deck.dueCount > 0)
    .sort((a, b) => b.dueCount - a.dueCount)
  const dueCount = dueDecks.reduce((sum, deck) => sum + deck.dueCount, 0)
  const wrongCount = getWrongQuestions(undefined, Number.MAX_SAFE_INTEGER).length
  const pendingDocuments = documents
    .filter((doc) => (doc.scrollPct ?? 0) < DONE_READING_PCT)
    .sort((a, b) => (b.lastReadAt || b.createdAt || '').localeCompare(a.lastReadAt || a.createdAt || ''))

  const reviewSession = loadReviewSession()
  const validReviewSession = reviewSession && decks.some((deck) => deck.id === reviewSession.deckId)
    ? reviewSession
    : null
  const practiceSession = loadLastSession()
  const validPracticeSession = practiceSession && questions.some((question) => question.subject === practiceSession.subject)
    ? practiceSession
    : null
  const continueDocument = getContinueReading()

  const interrupted = [
    validReviewSession && {
      key: 'recall',
      route: `/review/${validReviewSession.deckId}`,
      title: validReviewSession.deckName,
      timestamp: validReviewSession.savedAt || 0,
      kind: 'resume',
    },
    validPracticeSession && {
      key: 'practice',
      route: validPracticeSession.route,
      title: validPracticeSession.chapter || getSubjectDisplayName(validPracticeSession.subject),
      timestamp: validPracticeSession.timestamp || 0,
      kind: 'resume',
    },
    continueDocument && {
      key: 'reading',
      route: `/reading/doc/${continueDocument.id}?col=${continueDocument.collectionId}`,
      title: continueDocument.title,
      timestamp: Date.parse(continueDocument.lastReadAt) || 0,
      kind: 'resume',
    },
  ].filter(Boolean).sort(newestFirst)

  const stages = [
    {
      key: 'recall',
      count: dueCount,
      route: validReviewSession?.deckId
        ? `/review/${validReviewSession.deckId}`
        : dueDecks[0]
          ? `/review/${dueDecks[0].id}`
          : null,
      interrupted: Boolean(validReviewSession),
      title: validReviewSession?.deckName || dueDecks[0]?.name || null,
    },
    {
      key: 'practice',
      count: wrongCount,
      route: validPracticeSession?.route || (wrongCount > 0 ? '/wrong' : null),
      interrupted: Boolean(validPracticeSession),
      title: validPracticeSession?.chapter || (validPracticeSession ? getSubjectDisplayName(validPracticeSession.subject) : null),
    },
    {
      key: 'reading',
      count: pendingDocuments.length,
      route: continueDocument
        ? `/reading/doc/${continueDocument.id}?col=${continueDocument.collectionId}`
        : pendingDocuments[0]
          ? `/reading/doc/${pendingDocuments[0].id}?col=${pendingDocuments[0].collectionId}`
          : null,
      interrupted: Boolean(continueDocument),
      title: continueDocument?.title || pendingDocuments[0]?.title || null,
      progress: continueDocument?.scrollPct ?? null,
    },
  ]

  const firstPending = stages.find((stage) => stage.route)
  const primary = interrupted[0] || (firstPending ? {
    key: firstPending.key,
    route: firstPending.route,
    title: firstPending.title,
    kind: 'start',
  } : null)

  return {
    primary,
    stages,
    totalItems: dueCount + wrongCount + pendingDocuments.length,
    hasMaterial: decks.length + questions.length + documents.length > 0,
    isComplete: !primary && decks.length + questions.length + documents.length > 0,
  }
}
