import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportData, exportDeck, importData, loadData, saveData } from './storage'

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

describe('flashcard storage schema version', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes and reads the versioned mnemos-data wrapper', () => {
    saveData({
      decks: [{ id: 'deck-1', name: 'Deck' }],
      cards: [{ id: 'card-1', deckId: 'deck-1', front: 'Q', back: 'A' }],
    })

    expect(JSON.parse(localStorage.getItem('mnemos-data'))).toMatchObject({
      version: 1,
      decks: [{ id: 'deck-1' }],
      cards: [{ id: 'card-1' }],
    })
    expect(loadData()).toMatchObject({
      version: 1,
      decks: [{ id: 'deck-1' }],
      cards: [{ id: 'card-1' }],
    })
  })

  it('accepts legacy backups and rewrites them as versioned data on import', () => {
    const result = importData(
      JSON.stringify({
        decks: [{ id: 'legacy-deck', name: 'Legacy' }],
        cards: [],
      })
    )

    expect(result).toEqual({ ok: true })
    expect(JSON.parse(localStorage.getItem('mnemos-data'))).toEqual({
      version: 1,
      decks: [{ id: 'legacy-deck', name: 'Legacy' }],
      cards: [],
    })
  })

  it('exports full and deck-level flashcard backups with version 1', () => {
    saveData({
      decks: [{ id: 'deck-1', name: 'Deck' }],
      cards: [{ id: 'card-1', deckId: 'deck-1' }],
    })

    expect(JSON.parse(exportData())).toMatchObject({
      version: 1,
      decks: [{ id: 'deck-1' }],
      cards: [{ id: 'card-1' }],
    })
    expect(JSON.parse(exportDeck('deck-1'))).toMatchObject({
      version: 1,
      decks: [{ id: 'deck-1' }],
      cards: [{ id: 'card-1' }],
    })
  })
})
