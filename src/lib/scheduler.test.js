import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./storage', () => ({
  getDailyLimit: vi.fn(),
  loadData: vi.fn(),
}))

import { getDailyLimit, loadData } from './storage'
import { getAllDeckStats, getDeckStats, getDueCards, isDue } from './scheduler'

const reviewedToday = new Date(2026, 4, 3, 9).toISOString()

function setData(cards, decks = [{ id: 'deck-1', name: 'Deck 1' }]) {
  loadData.mockReturnValue({ decks, cards })
}

describe('scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 12))
    getDailyLimit.mockReturnValue(null)
    loadData.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('detects cards due today or earlier', () => {
    expect(isDue({ dueDate: '2026-05-03' })).toBe(true)
    expect(isDue({ dueDate: '2026-05-01' })).toBe(true)
    expect(isDue({ dueDate: '2026-05-04' })).toBe(false)
  })

  it('returns sorted active recall cards for a deck and applies the daily limit', () => {
    setData([
      { id: 'future', deckId: 'deck-1', dueDate: '2026-05-04' },
      { id: 'today', deckId: 'deck-1', dueDate: '2026-05-03' },
      { id: 'overdue', deckId: 'deck-1', dueDate: '2026-05-01' },
      { id: 'reference', deckId: 'deck-1', dueDate: '2026-05-01', type: 'reference' },
      { id: 'suspended', deckId: 'deck-1', dueDate: '2026-05-01', suspended: true },
      { id: 'other-deck', deckId: 'deck-2', dueDate: '2026-05-01' },
    ])
    getDailyLimit.mockReturnValue(2)

    expect(getDueCards('deck-1').map((card) => card.id)).toEqual(['overdue', 'today'])
  })

  it('summarizes deck review counts and future due distribution', () => {
    setData([
      {
        id: 'reviewed',
        deckId: 'deck-1',
        dueDate: '2026-05-03',
        updatedAt: reviewedToday,
        repetitions: 1,
      },
      { id: 'new', deckId: 'deck-1', dueDate: '2026-05-03', repetitions: 0 },
      { id: 'tomorrow', deckId: 'deck-1', dueDate: '2026-05-04', repetitions: 0 },
      { id: 'suspended', deckId: 'deck-1', dueDate: '2026-05-01', suspended: true },
      { id: 'reference', deckId: 'deck-1', dueDate: '2026-05-01', type: 'reference' },
    ])

    expect(getDeckStats('deck-1')).toMatchObject({
      total: 5,
      dueCount: 2,
      reviewedToday: 1,
      suspendedCount: 1,
      futureDistribution: [
        { date: '2026-05-03', count: 2 },
        { date: '2026-05-04', count: 1 },
        { date: '2026-05-05', count: 0 },
        { date: '2026-05-06', count: 0 },
        { date: '2026-05-07', count: 0 },
        { date: '2026-05-08', count: 0 },
        { date: '2026-05-09', count: 0 },
      ],
    })
  })

  it('summarizes every deck for the home overview', () => {
    setData(
      [
        {
          id: 'due',
          deckId: 'deck-1',
          dueDate: '2026-05-03',
          updatedAt: reviewedToday,
          repetitions: 1,
        },
        { id: 'future', deckId: 'deck-2', dueDate: '2026-05-04', repetitions: 0 },
      ],
      [
        { id: 'deck-1', name: 'Deck 1' },
        { id: 'deck-2', name: 'Deck 2' },
      ]
    )

    expect(getAllDeckStats()).toMatchObject([
      { id: 'deck-1', name: 'Deck 1', totalCards: 1, dueCount: 1, reviewedToday: 1 },
      { id: 'deck-2', name: 'Deck 2', totalCards: 1, dueCount: 0, reviewedToday: 0 },
    ])
  })
})
