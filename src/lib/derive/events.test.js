import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readEvents, recordEvent, splitSessions, dayKey, SCHEMA_VERSION, SESSION_GAP_MS } from './events'

function createLocalStorage(seed = {}) {
  const store = new Map(Object.entries(seed))
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    _raw: () => store,
  }
}

const KEY = 'mnemos-review-log'
const T = new Date(2026, 4, 3, 12).getTime()

function seedLog(value) {
  return { [KEY]: JSON.stringify(value) }
}

describe('derive/events · v1 → v2 升格', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('把 v1 之 type 归并为 module，并落回磁盘一次', () => {
    const ls = createLocalStorage(seedLog({
      entries: [
        { id: 'a', timestamp: T, type: 'flashcard', quality: 4, itemId: 'c1', deckId: 'd1' },
        { id: 'b', timestamp: T + 1, type: 'quiz', correct: true, itemId: 'q1', subject: 's1' },
      ],
    }))
    vi.stubGlobal('localStorage', ls)

    const events = readEvents()
    expect(events.map((e) => e.module)).toEqual(['recall', 'practice'])
    expect(events[0].type).toBeUndefined()

    const written = JSON.parse(ls._raw().get(KEY))
    expect(written.schemaVersion).toBe(SCHEMA_VERSION)
    expect(written.entries[0].module).toBe('recall')
  })

  it('弃不可解之条目（无 timestamp、或 type/module 皆缺）', () => {
    vi.stubGlobal('localStorage', createLocalStorage(seedLog({
      entries: [
        { id: 'ok', timestamp: T, type: 'flashcard', itemId: 'c1' },
        { id: 'no-ts', type: 'flashcard', itemId: 'c2' },
        { id: 'no-kind', timestamp: T, itemId: 'c3' },
        null,
      ],
    })))
    expect(readEvents().map((e) => e.id)).toEqual(['ok'])
  })

  it('v2 之档不再重写', () => {
    const ls = createLocalStorage(seedLog({
      schemaVersion: SCHEMA_VERSION,
      entries: [{ id: 'a', timestamp: T, module: 'recall', itemId: 'c1' }],
    }))
    vi.stubGlobal('localStorage', ls)
    readEvents()
    expect(ls.setItem).not.toHaveBeenCalled()
  })

  it('按时序排定，不问磁盘上的次序', () => {
    vi.stubGlobal('localStorage', createLocalStorage(seedLog({
      schemaVersion: SCHEMA_VERSION,
      entries: [
        { id: 'late', timestamp: T + 100, module: 'recall', itemId: 'c2' },
        { id: 'early', timestamp: T, module: 'recall', itemId: 'c1' },
      ],
    })))
    expect(readEvents().map((e) => e.id)).toEqual(['early', 'late'])
  })
})

describe('derive/events · recordEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 12))
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-1' })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('写入携 schemaVersion，并盖上时刻', () => {
    const ls = createLocalStorage()
    vi.stubGlobal('localStorage', ls)

    recordEvent({ module: 'recall', quality: 5, itemId: 'c1', deckId: 'd1' })

    const written = JSON.parse(ls._raw().get(KEY))
    expect(written.schemaVersion).toBe(SCHEMA_VERSION)
    expect(written.entries).toHaveLength(1)
    expect(written.entries[0]).toMatchObject({
      id: 'uuid-1', module: 'recall', quality: 5, itemId: 'c1', deckId: 'd1',
    })
    expect(written.entries[0].timestamp).toBe(Date.now())
  })

  it('汰去逾 90 日之旧事件', () => {
    const old = Date.now() - 91 * 86400000
    vi.stubGlobal('localStorage', createLocalStorage(seedLog({
      schemaVersion: SCHEMA_VERSION,
      entries: [{ id: 'ancient', timestamp: old, module: 'recall', itemId: 'c0' }],
    })))

    recordEvent({ module: 'recall', itemId: 'c1' })
    expect(readEvents().map((e) => e.id)).toEqual(['uuid-1'])
  })
})

describe('derive/events · splitSessions', () => {
  it('以静默阈切分，逾阈者另起一场', () => {
    const events = [
      { timestamp: T, module: 'recall' },
      { timestamp: T + 60_000, module: 'recall' },
      { timestamp: T + 60_000 + SESSION_GAP_MS + 1, module: 'recall' },
    ]
    const sessions = splitSessions(events)
    expect(sessions).toHaveLength(2)
    expect(sessions[0].events).toHaveLength(2)
    expect(sessions[0].startedAt).toBe(T)
    expect(sessions[0].endedAt).toBe(T + 60_000)
    expect(sessions[1].events).toHaveLength(1)
  })

  it('恰在阈上者仍属同一场（逾阈方切）', () => {
    const sessions = splitSessions([
      { timestamp: T, module: 'recall' },
      { timestamp: T + SESSION_GAP_MS, module: 'recall' },
    ])
    expect(sessions).toHaveLength(1)
  })

  it('空流得空表', () => {
    expect(splitSessions([])).toEqual([])
  })
})

describe('derive/events · dayKey', () => {
  it('取本地日键，不取 UTC', () => {
    // 2026-05-03 23:30 本地 —— UTC 若东移即跨日，本地口径不得跟着跳
    expect(dayKey(new Date(2026, 4, 3, 23, 30).getTime())).toBe('2026-05-03')
  })
})
