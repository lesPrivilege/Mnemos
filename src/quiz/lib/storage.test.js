import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let exportData
let importData
let saveQuestions
let saveLastSession
let loadLastSession
let clearLastSession
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
    saveLastSession = storage.saveLastSession
    loadLastSession = storage.loadLastSession
    clearLastSession = storage.clearLastSession
    flushBigStoreWritesForTests = bigStore.flushBigStoreWritesForTests

    await bigStore.hydrate()
  })

  afterEach(async () => {
    // Big-record writes are async fire-and-forget; flush them before the
    // globals they touch (localStorage, indexedDB) get torn down below.
    await flushBigStoreWritesForTests()
    vi.useRealTimers()
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

  it('round-trips an interrupted quiz session with recovery payload', async () => {
    const session = {
      subject: '物', chapter: '力学', section: '运动', mode: 'random',
      route: '/quiz/物?chapter=%E5%8A%9B%E5%AD%A6',
      questionIds: ['q1', 'q2'],
      currentIndex: 1,
      results: [{ id: 'q1', correct: true, wrongStreak: 0 }],
    }
    saveLastSession(session)

    const loaded = loadLastSession()
    expect(loaded).toMatchObject(session)
    expect(loaded.timestamp).toBeTypeOf('number')
  })

  it('drops stale sessions after 24h', async () => {
    saveLastSession({ subject: '物', route: '/quiz/物' })

    vi.useFakeTimers()
    vi.setSystemTime(Date.now() + 86400000 + 1000)
    expect(loadLastSession()).toBeNull()
    expect(localStorage.getItem('examprep-last-session')).toBeNull()
    vi.useRealTimers()
  })

  it('clears the session on dismiss / completion', async () => {
    saveLastSession({ subject: '物', route: '/quiz/物' })
    expect(loadLastSession()).not.toBeNull()

    clearLastSession()
    expect(loadLastSession()).toBeNull()
    expect(localStorage.getItem('examprep-last-session')).toBeNull()
  })
})
