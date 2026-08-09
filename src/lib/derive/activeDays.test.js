import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./events', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, readEvents: vi.fn() }
})

import { readEvents } from './events'
import { activeDayKeys, readLegacyPracticeAttempts, readReadingSessions } from './activeDays'

/* 本地日界之验：取 05-03 之当地 23:30 与 05-04 之当地 00:30。
   若误按 UTC 切日，二者在东八区会并入同一日，在西五区会各错一日。 */
const NOW = new Date(2026, 4, 4, 12)
const DAY = 86400000

function at(dayOffset, hour = 12, minute = 0) {
  const d = new Date(NOW)
  d.setDate(NOW.getDate() - dayOffset)
  d.setHours(hour, minute, 0, 0)
  return d.getTime()
}

function key(dayOffset) {
  const d = new Date(NOW)
  d.setDate(NOW.getDate() - dayOffset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ev(overrides) {
  return { id: Math.random().toString(36), module: 'recall', itemId: 'c', ...overrides }
}

function createLocalStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)) },
    removeItem: (k) => { store.delete(k) },
    clear: () => { store.clear() },
  }
}

function putReading(sessions) {
  localStorage.setItem('reading-stats', JSON.stringify({ sessions }))
}
function putLegacyPractice(progress) {
  localStorage.setItem('examprep-progress', JSON.stringify(progress))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.stubGlobal('localStorage', createLocalStorage())
  readEvents.mockReturnValue([])
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('activeDayKeys', () => {
  it('三源无一有事者，空集', () => {
    expect(activeDayKeys()).toEqual(new Set())
  })

  it('仅阅读之日亦为活跃日——旧口径此处归零，是本轮所收之口', () => {
    putReading([{ startedAt: at(0), minutesRead: 1 }])
    expect(activeDayKeys()).toEqual(new Set([key(0)]))
  })

  it('读了零分钟不算活跃', () => {
    putReading([{ startedAt: at(0), minutesRead: 0 }])
    expect(activeDayKeys()).toEqual(new Set())
  })

  it('无 startedAt 之残会话不入', () => {
    putReading([{ minutesRead: 30 }])
    expect(activeDayKeys()).toEqual(new Set())
  })

  it('仅旧练习进度兜底之日亦为活跃日', () => {
    putLegacyPractice({ q1: { last_attempt: Math.floor(at(1) / 1000), status: 'correct' } })
    expect(activeDayKeys()).toEqual(new Set([key(1)]))
  })

  it('事件流已有练习事件时不取兜底——同一次作答不记两遍', () => {
    readEvents.mockReturnValue([ev({ module: 'practice', timestamp: at(0) })])
    putLegacyPractice({ q1: { last_attempt: Math.floor(at(5) / 1000), status: 'correct' } })
    expect(readLegacyPracticeAttempts(readEvents())).toEqual([])
    expect(activeDayKeys()).toEqual(new Set([key(0)]))
  })

  it('三模块跨日并集', () => {
    readEvents.mockReturnValue([
      ev({ module: 'recall', timestamp: at(0) }),
      ev({ module: 'practice', timestamp: at(2) }),
    ])
    putReading([{ startedAt: at(4), minutesRead: 12 }])
    expect(activeDayKeys()).toEqual(new Set([key(0), key(2), key(4)]))
  })

  it('同日多事件只算一天', () => {
    readEvents.mockReturnValue([
      ev({ timestamp: at(0, 9) }),
      ev({ timestamp: at(0, 14) }),
      ev({ module: 'practice', timestamp: at(0, 21) }),
    ])
    putReading([{ startedAt: at(0, 22), minutesRead: 5 }])
    expect(activeDayKeys()).toEqual(new Set([key(0)]))
  })

  it('日界取本地时区：当地 23:30 与次日 00:30 分属两天', () => {
    readEvents.mockReturnValue([
      ev({ timestamp: at(1, 23, 30) }),
      ev({ timestamp: at(0, 0, 30) }),
    ])
    expect(activeDayKeys()).toEqual(new Set([key(1), key(0)]))
  })

  it('今日未动者，今日不入集——断不断链归 streak 判', () => {
    readEvents.mockReturnValue([ev({ timestamp: at(1) })])
    const keys = activeDayKeys()
    expect(keys.has(key(1))).toBe(true)
    expect(keys.has(key(0))).toBe(false)
  })

  it('损坏之 reading-stats 不炸，退作空', () => {
    localStorage.setItem('reading-stats', '{oops')
    expect(readReadingSessions()).toEqual([])
    expect(activeDayKeys()).toEqual(new Set())
  })
})

describe('readLegacyPracticeAttempts', () => {
  it('秒转毫秒，status 判对错', () => {
    const sec = Math.floor(at(3) / 1000)
    putLegacyPractice({
      a: { last_attempt: sec, status: 'correct' },
      b: { last_attempt: sec, status: 'wrong' },
      c: { status: 'correct' }, // 无 last_attempt，弃
    })
    const attempts = readLegacyPracticeAttempts([])
    expect(attempts).toHaveLength(2)
    expect(attempts[0]).toEqual({ timestamp: sec * 1000, correct: true })
    expect(attempts[1]).toEqual({ timestamp: sec * 1000, correct: false })
    expect(Math.abs(attempts[0].timestamp - at(3))).toBeLessThan(DAY)
  })
})
