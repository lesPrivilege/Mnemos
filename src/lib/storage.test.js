import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let exportData
let exportDeck
let importData
let loadData
let saveData
let flushBigStoreWritesForTests

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
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', createLocalStorage())
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' })
    vi.stubGlobal('indexedDB', new IDBFactory())

    const storage = await import('./storage')
    const bigStore = await import('./bigStore')

    exportData = storage.exportData
    exportDeck = storage.exportDeck
    importData = storage.importData
    loadData = storage.loadData
    saveData = storage.saveData
    flushBigStoreWritesForTests = bigStore.flushBigStoreWritesForTests

    await bigStore.hydrate()
  })

  afterEach(async () => {
    // Big-record writes are async fire-and-forget; flush them before the
    // globals they touch (localStorage, indexedDB) get torn down below.
    await flushBigStoreWritesForTests()
    vi.unstubAllGlobals()
  })

  it('writes and reads the versioned mnemos-data wrapper, IDB-backed only', async () => {
    saveData({
      decks: [{ id: 'deck-1', name: 'Deck' }],
      cards: [{ id: 'card-1', deckId: 'deck-1', front: 'Q', back: 'A' }],
    })
    await flushBigStoreWritesForTests()

    expect(loadData()).toMatchObject({
      version: 1,
      decks: [{ id: 'deck-1' }],
      cards: [{ id: 'card-1' }],
    })
    // No more localStorage dual-write for this big record (R4+1).
    expect(localStorage.getItem('mnemos-data')).toBeNull()
  })

  it('accepts legacy backups and rewrites them as versioned data on import', async () => {
    const result = importData(
      JSON.stringify({
        decks: [{ id: 'legacy-deck', name: 'Legacy' }],
        cards: [],
      })
    )
    await flushBigStoreWritesForTests()

    expect(result).toEqual({ ok: true })
    expect(loadData()).toEqual({
      version: 1,
      decks: [{ id: 'legacy-deck', name: 'Legacy' }],
      cards: [],
    })
    expect(localStorage.getItem('mnemos-data')).toBeNull()
  })

  it('exports full and deck-level flashcard backups with version 1', async () => {
    saveData({
      decks: [{ id: 'deck-1', name: 'Deck' }],
      cards: [{ id: 'card-1', deckId: 'deck-1' }],
    })
    await flushBigStoreWritesForTests()

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
