import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  discardQuarantined,
  getQuarantinedRaw,
  listQuarantined,
  quarantine,
} from './quarantine'
import { loadData } from './storage'

function createLocalStorage() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

describe('quarantine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 9))
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('quarantines corrupt flashcard JSON and returns the fallback', () => {
    localStorage.setItem('mnemos-data', '{oops')

    expect(loadData()).toEqual({ decks: [], cards: [] })
    expect(listQuarantined()).toEqual([
      {
        key: 'mnemos-data',
        quarantinedAt: '2026-05-03T01:00:00.000Z',
        error: expect.stringContaining('JSON'),
        size: 5,
      },
    ])
    expect(getQuarantinedRaw('mnemos-data')).toBe('{oops')
  })

  it('does not quarantine an absent key', () => {
    expect(loadData()).toEqual({ decks: [], cards: [] })
    expect(listQuarantined()).toEqual([])
  })

  it('dedupes the quarantine index', () => {
    quarantine('mnemos-data', '{oops', new Error('first'))
    quarantine('mnemos-data', '{oops again', new Error('second'))

    expect(listQuarantined()).toHaveLength(1)
    expect(listQuarantined()[0]).toMatchObject({
      key: 'mnemos-data',
      error: 'second',
    })
    expect(getQuarantinedRaw('mnemos-data')).toBe('{oops again')
  })

  it('discards an entry and removes it from the index', () => {
    quarantine('mnemos-data', '{oops', new Error('broken'))

    discardQuarantined('mnemos-data')

    expect(getQuarantinedRaw('mnemos-data')).toBeNull()
    expect(listQuarantined()).toEqual([])
  })
})
