import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let exportData
let importData
let saveQuestions
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

describe('quiz storage schema version', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', createLocalStorage())
    vi.stubGlobal('indexedDB', new IDBFactory())

    const storage = await import('./storage')
    const bigStore = await import('../../lib/bigStore')

    exportData = storage.exportData
    importData = storage.importData
    saveQuestions = storage.saveQuestions
    flushBigStoreWritesForTests = bigStore.flushBigStoreWritesForTests

    await bigStore.hydrate()
  })

  afterEach(async () => {
    // Big-record writes are async fire-and-forget; flush them before the
    // globals they touch (localStorage, indexedDB) get torn down below.
    await flushBigStoreWritesForTests()
    vi.unstubAllGlobals()
  })

  it('writes a schema marker when quiz data is saved', async () => {
    saveQuestions([{ id: 'q1', type: 'choice' }])
    await flushBigStoreWritesForTests()

    expect(localStorage.getItem('examprep-schema-version')).toBe('1')
  })

  it('exports versioned quiz backups', async () => {
    saveQuestions([{ id: 'q1', type: 'choice' }])
    await flushBigStoreWritesForTests()

    expect(JSON.parse(exportData())).toMatchObject({
      version: 1,
      questions: [{ id: 'q1' }],
      progress: {},
      starred: [],
    })
  })

  it('imports legacy and versioned quiz payloads', async () => {
    expect(
      importData(
        JSON.stringify({
          questions: [{ id: 'legacy' }],
          progress: { legacy: { status: 'todo' } },
          starred: ['legacy'],
        })
      )
    ).toEqual({ questions: 1, progress: 1, starred: 1 })
    await flushBigStoreWritesForTests()
    expect(localStorage.getItem('examprep-schema-version')).toBe('1')

    expect(
      importData(
        JSON.stringify({
          version: 1,
          questions: [{ id: 'versioned' }],
          progress: {},
          starred: [],
        })
      )
    ).toEqual({ questions: 1, progress: 0, starred: 0 })
    await flushBigStoreWritesForTests()
  })
})
