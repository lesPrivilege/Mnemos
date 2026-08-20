import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../scheduler', () => ({ getAllDeckStats: vi.fn() }))
vi.mock('../reviewSession', () => ({ loadReviewSession: vi.fn() }))
vi.mock('../../quiz/lib/storage', () => ({ loadLastSession: vi.fn(), loadQuestions: vi.fn() }))
vi.mock('../../quiz/lib/quizEngine', () => ({ getWrongQuestions: vi.fn() }))
vi.mock('../../reading/lib/storage', () => ({ getContinueReading: vi.fn(), getDocuments: vi.fn() }))

import { getAllDeckStats } from '../scheduler'
import { loadReviewSession } from '../reviewSession'
import { loadLastSession, loadQuestions } from '../../quiz/lib/storage'
import { getWrongQuestions } from '../../quiz/lib/quizEngine'
import { getContinueReading, getDocuments } from '../../reading/lib/storage'
import { todayJourney } from './today'

beforeEach(() => {
  getAllDeckStats.mockReturnValue([])
  loadReviewSession.mockReturnValue(null)
  loadLastSession.mockReturnValue(null)
  loadQuestions.mockReturnValue([])
  getWrongQuestions.mockReturnValue([])
  getContinueReading.mockReturnValue(null)
  getDocuments.mockReturnValue([])
})

describe('todayJourney', () => {
  it('chooses the newest valid interrupted session before pending work', () => {
    getAllDeckStats.mockReturnValue([{ id: 'd1', name: '微积分', dueCount: 8 }])
    loadQuestions.mockReturnValue([{ id: 'q1', subject: 'math' }])
    loadReviewSession.mockReturnValue({ deckId: 'd1', deckName: '微积分', savedAt: 100 })
    loadLastSession.mockReturnValue({ subject: 'math', chapter: '极限', route: '/quiz/math', timestamp: 200 })
    getWrongQuestions.mockReturnValue([{ id: 'q1' }])

    const journey = todayJourney()

    expect(journey.primary).toMatchObject({ key: 'practice', route: '/quiz/math', kind: 'resume' })
    expect(journey.totalItems).toBe(9)
  })

  it('falls through to due cards, wrong questions, then reading', () => {
    getAllDeckStats.mockReturnValue([{ id: 'd1', name: '微积分', dueCount: 4 }])
    loadQuestions.mockReturnValue([{ id: 'q1', subject: 'math' }])
    getWrongQuestions.mockReturnValue([{ id: 'q1' }])
    getDocuments.mockReturnValue([{ id: 'doc1', collectionId: 'c1', title: '第一章', scrollPct: 0, createdAt: '2026-08-01' }])

    expect(todayJourney().primary).toMatchObject({ key: 'recall', route: '/review/d1', kind: 'start' })

    getAllDeckStats.mockReturnValue([{ id: 'd1', name: '微积分', dueCount: 0 }])
    expect(todayJourney().primary).toMatchObject({ key: 'practice', route: '/wrong' })

    getWrongQuestions.mockReturnValue([])
    expect(todayJourney().primary).toMatchObject({ key: 'reading', route: '/reading/doc/doc1?col=c1' })
  })

  it('reports a quiet completion state when material exists but nothing needs action', () => {
    getAllDeckStats.mockReturnValue([{ id: 'd1', name: '微积分', dueCount: 0 }])

    expect(todayJourney()).toMatchObject({ primary: null, hasMaterial: true, isComplete: true, totalItems: 0 })
  })

  it('encodes collection ids when producing a reader query', () => {
    getDocuments.mockReturnValue([{ id: 'doc1', collectionId: 'East Asia/R&D', title: '第一章', scrollPct: 0, createdAt: '2026-08-01' }])

    expect(todayJourney().primary).toMatchObject({
      key: 'reading',
      route: '/reading/doc/doc1?col=East%20Asia%2FR%26D',
    })
  })

  it('does not resume sessions whose material has been deleted', () => {
    loadReviewSession.mockReturnValue({ deckId: 'missing', deckName: '旧卡组', savedAt: 200 })
    loadLastSession.mockReturnValue({ subject: 'missing', route: '/quiz/missing', timestamp: 300 })

    expect(todayJourney()).toMatchObject({ primary: null, hasMaterial: false, isComplete: false })
  })
})
