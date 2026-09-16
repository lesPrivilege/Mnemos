import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./derive/events', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, readEvents: vi.fn() }
})

import { readEvents } from './derive/events'
import { getActivityDashboard } from './activity'

/* 5 月 20 日：本月已过二十日，近 7 日为 14–20——两个窗口不相等，
   故「本月活跃」与「近 7 日活跃」两数可各自验。 */
const NOW = new Date(2026, 4, 20, 12)

function at(dayOffset, hour = 12) {
  const d = new Date(NOW)
  d.setDate(NOW.getDate() - dayOffset)
  d.setHours(hour, 0, 0, 0)
  return d.getTime()
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

describe('getActivityDashboard · 连续天数之口径（记-32）', () => {
  it('今日只读了书，连续天数不得为零', () => {
    localStorage.setItem('reading-stats', JSON.stringify({
      sessions: [{ startedAt: at(0), minutesRead: 1 }],
    }))
    const d = getActivityDashboard()
    expect(d.today.reading).toBe(1)
    expect(d.monthActiveDays).toBe(1)
    expect(d.streak).toBe(1)
  })

  it('阅读接续记忆之链，一屏之内三数相合', () => {
    readEvents.mockReturnValue([ev({ timestamp: at(2) }), ev({ timestamp: at(3) })])
    localStorage.setItem('reading-stats', JSON.stringify({
      sessions: [{ startedAt: at(0), minutesRead: 8 }, { startedAt: at(1), minutesRead: 8 }],
    }))
    const d = getActivityDashboard()
    expect(d.streak).toBe(4)
    expect(d.monthActiveDays).toBe(4)
    expect(d.weekActiveDays).toBe(4)
  })

  it('旧练习进度兜底之日入链', () => {
    localStorage.setItem('examprep-progress', JSON.stringify({
      q1: { last_attempt: Math.floor(at(0) / 1000), status: 'correct' },
      q2: { last_attempt: Math.floor(at(1) / 1000), status: 'wrong' },
    }))
    const d = getActivityDashboard()
    expect(d.today.practice).toBe(1)
    expect(d.today.practiceCorrect).toBe(1)
    expect(d.streak).toBe(2)
  })

  it('事件流已有练习事件时兜底不再叠加', () => {
    readEvents.mockReturnValue([ev({ module: 'practice', timestamp: at(0), correct: true })])
    localStorage.setItem('examprep-progress', JSON.stringify({
      q1: { last_attempt: Math.floor(at(0) / 1000), status: 'correct' },
    }))
    expect(getActivityDashboard().today.practice).toBe(1)
  })

  it('今日未动不立即断掉截至昨日之链', () => {
    readEvents.mockReturnValue([ev({ timestamp: at(1) }), ev({ timestamp: at(2) })])
    const d = getActivityDashboard()
    expect(d.today.recall).toBe(0)
    expect(d.streak).toBe(2)
  })

  it('三源皆空，诸数为零', () => {
    const d = getActivityDashboard()
    expect(d.streak).toBe(0)
    expect(d.monthActiveDays).toBe(0)
    expect(d.weekActiveDays).toBe(0)
  })
})

describe('getActivityDashboard · 本周之量纲（记-32）', () => {
  it('近 7 日之数以「天」计，不以三量纲之和计', () => {
    readEvents.mockReturnValue([
      ev({ timestamp: at(0) }),
      ev({ timestamp: at(0, 13) }),
      ev({ timestamp: at(0, 14) }),
      ev({ timestamp: at(1) }),
    ])
    localStorage.setItem('reading-stats', JSON.stringify({
      sessions: [{ startedAt: at(0), minutesRead: 45 }],
    }))
    const d = getActivityDashboard()
    // 旧口径此处为 3 + 45 = 48「次」；新口径为 2 天
    expect(d.weekActiveDays).toBe(2)
    expect(d.weekActiveDays).toBeLessThanOrEqual(7)
    expect(d).not.toHaveProperty('weekTotals')
  })

  it('本月窗大于近 7 日窗，两数各自成立', () => {
    readEvents.mockReturnValue([ev({ timestamp: at(0) }), ev({ timestamp: at(10) })])
    const d = getActivityDashboard()
    expect(d.monthActiveDays).toBe(2)
    expect(d.weekActiveDays).toBe(1)
  })

  it('本月之前的活跃日不计入本月活跃', () => {
    readEvents.mockReturnValue([ev({ timestamp: at(25) })]) // 4 月
    const d = getActivityDashboard()
    expect(d.monthActiveDays).toBe(0)
    expect(d.streak).toBe(0)
  })
})

it('keeps an explicit zero-minute record distinct from absent and invalid readings', async () => {
  const { getHeatmapData } = await import('./activity')
  localStorage.setItem('reading-stats', JSON.stringify({ sessions: [
    { startedAt: at(0), minutesRead: 0 }, { startedAt: at(1), minutesRead: -5 }, { startedAt: at(2) },
  ] }))
  const { days } = getHeatmapData()
  expect(days.at(-1)).toMatchObject({ reading: 0, recorded: { reading: true, recall: false } })
  expect(days.at(-2)).toMatchObject({ reading: 0, recorded: { reading: false } })
  expect(days.at(-3)).toMatchObject({ reading: 0, recorded: { reading: false } })
})
