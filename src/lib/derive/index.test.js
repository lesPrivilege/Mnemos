import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../scheduler', () => ({ getAllDeckStats: vi.fn() }))
vi.mock('../storage', () => ({ loadData: vi.fn() }))
vi.mock('./events', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, readEvents: vi.fn() }
})

import { getAllDeckStats } from '../scheduler'
import { loadData } from '../storage'
import { readEvents } from './events'
import { todayFocus, forecast7, streak, deckProgress, lastReviewedAt, nextDue, sessionSummary } from './index'

const NOW = new Date(2026, 4, 3, 12) // 周日
const DAY = 86400000

function ev(overrides) {
  return { id: Math.random().toString(36), module: 'recall', itemId: 'c', ...overrides }
}

/** 已复习多次之卡：EF 满、重复多、无失误 → solid */
function solidCard(id, deckId = 'd1') {
  return { id, deckId, type: 'recall', repetitions: 8, easiness: 2.5, lapses: 0, dueDate: '2026-06-01' }
}
function weakCard(id, deckId = 'd1') {
  return { id, deckId, type: 'recall', repetitions: 1, easiness: 1.3, lapses: 4, dueDate: '2026-05-01' }
}
function newCard(id, deckId = 'd1') {
  return { id, deckId, type: 'recall', repetitions: 0, easiness: 2.5, lapses: 0, dueDate: '2026-05-03' }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  readEvents.mockReturnValue([])
  loadData.mockReturnValue({ decks: [], cards: [] })
  getAllDeckStats.mockReturnValue([])
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('todayFocus', () => {
  it('主数为各册到期之和，分解只列前二，去处指到期最多之册', () => {
    getAllDeckStats.mockReturnValue([
      { id: 'a', name: 'A', dueCount: 4, totalCards: 10 },
      { id: 'b', name: 'B', dueCount: 8, totalCards: 20 },
      { id: 'c', name: 'C', dueCount: 2, totalCards: 5 },
      { id: 'd', name: 'D', dueCount: 0, totalCards: 5 },
    ])
    const f = todayFocus()
    expect(f.dueTotal).toBe(14)
    expect(f.deckCount).toBe(4)
    expect(f.breakdown).toEqual([
      { id: 'b', name: 'B', due: 8 },
      { id: 'a', name: 'A', due: 4 },
    ])
    expect(f.primary).toEqual({ deckId: 'b', all: false })
  })

  it('无到期而有册：去处指首册并标 all（复习全部）', () => {
    getAllDeckStats.mockReturnValue([{ id: 'a', name: 'A', dueCount: 0, totalCards: 10 }])
    const f = todayFocus()
    expect(f.dueTotal).toBe(0)
    expect(f.breakdown).toEqual([])
    expect(f.primary).toEqual({ deckId: 'a', all: true })
  })

  it('无册：无去处，不编造', () => {
    expect(todayFocus().primary).toBeNull()
  })
})

describe('forecast7', () => {
  it('各册之分布按周日→周六轴合并，并标今日', () => {
    getAllDeckStats.mockReturnValue([
      { id: 'a', futureDistribution: [{ date: '2026-05-03', count: 3 }, { date: '2026-05-04', count: 2 }] },
      { id: 'b', futureDistribution: [{ date: '2026-05-03', count: 5 }] },
    ])
    const { slots, total, max } = forecast7()
    expect(slots[0]).toMatchObject({ dow: 0, date: '2026-05-03', count: 8, isToday: true })
    expect(slots[1]).toMatchObject({ dow: 1, date: '2026-05-04', count: 2, isToday: false })
    expect(total).toBe(10)
    expect(max).toBe(8)
  })

  it('空库：七格皆零，max 不为零以免除零', () => {
    const { slots, total, max } = forecast7()
    expect(slots).toHaveLength(7)
    expect(total).toBe(0)
    expect(max).toBe(1)
  })
})

/* streak 之输入自记-32 起为跨模块活跃日键集（derive/activeDays），非事件流；
   「哪一天算活跃」之判在彼处有其自己的一批测。此处只验数链之法。 */
describe('streak', () => {
  const keys = (...offsets) => new Set(offsets.map((i) => {
    const d = new Date(NOW)
    d.setDate(NOW.getDate() - i)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }))

  it('数连续活动之日，今日未动不断链', () => {
    expect(streak(keys(1, 2, 3))).toBe(3)
  })

  it('中断即止，不数断链之前的', () => {
    expect(streak(keys(0, 1, 5, 6))).toBe(2)
  })

  it('今日已动则计入今日', () => {
    expect(streak(keys(0))).toBe(1)
  })

  it('空集得零', () => {
    expect(streak(new Set())).toBe(0)
  })

  it('唯昨日一天亦成链，今日尚有机会补', () => {
    expect(streak(keys(1))).toBe(1)
  })
})

describe('deckProgress', () => {
  it('分四档并给出熟练度计之充填比例', () => {
    loadData.mockReturnValue({
      decks: [],
      cards: [solidCard('1'), solidCard('2'), weakCard('3'), newCard('4'), solidCard('x', 'other')],
    })
    const p = deckProgress('d1')
    expect(p.total).toBe(4)
    expect(p.solid).toBe(2)
    expect(p.weak).toBe(1)
    expect(p.new).toBe(1)
    expect(p.masteryRatio).toBe(0.5)
  })

  it('空册不除零', () => {
    expect(deckProgress('d1').masteryRatio).toBe(0)
  })
})

describe('lastReviewedAt', () => {
  it('取该册最近一次 recall 之时刻，不为他册与练习所惑', () => {
    const t = NOW.getTime()
    readEvents.mockReturnValue([
      ev({ timestamp: t - 3 * DAY, deckId: 'd1' }),
      ev({ timestamp: t - 2 * DAY, deckId: 'other' }),
      ev({ timestamp: t - DAY, deckId: 'd1' }),
      ev({ timestamp: t, module: 'practice', subject: 's' }),
    ])
    expect(lastReviewedAt('d1')).toBe(t - DAY)
  })

  it('从未复习者得 null', () => {
    expect(lastReviewedAt('d1')).toBeNull()
  })
})

describe('nextDue', () => {
  it('取最近之未来到期日与其张数，已暂停者不计', () => {
    loadData.mockReturnValue({
      decks: [],
      cards: [
        { id: '1', deckId: 'd1', type: 'recall', dueDate: '2026-05-05' },
        { id: '2', deckId: 'd1', type: 'recall', dueDate: '2026-05-05' },
        { id: '3', deckId: 'd1', type: 'recall', dueDate: '2026-05-09' },
        { id: '4', deckId: 'd1', type: 'recall', dueDate: '2026-05-04', suspended: true },
        { id: '5', deckId: 'd1', type: 'recall', dueDate: '2026-05-03' }, // 今日，非「未来」
      ],
    })
    expect(nextDue('d1')).toEqual({ date: '2026-05-05', count: 2 })
  })

  it('无未来到期者得 null', () => {
    expect(nextDue('d1')).toBeNull()
  })
})

describe('sessionSummary', () => {
  const t = NOW.getTime()
  const HOUR = 3600_000

  it('给出本次与上次之差——完成屏之关系式', () => {
    readEvents.mockReturnValue([
      // 上次：三张，两好一重来，历时 2 分
      ev({ timestamp: t - 2 * HOUR, deckId: 'd1', quality: 5 }),
      ev({ timestamp: t - 2 * HOUR + 60_000, deckId: 'd1', quality: 4 }),
      ev({ timestamp: t - 2 * HOUR + 120_000, deckId: 'd1', quality: 1 }),
      // 本次：四张全好，历时 1 分
      ev({ timestamp: t - 60_000, deckId: 'd1', quality: 5 }),
      ev({ timestamp: t - 40_000, deckId: 'd1', quality: 4 }),
      ev({ timestamp: t - 20_000, deckId: 'd1', quality: 5 }),
      ev({ timestamp: t, deckId: 'd1', quality: 4 }),
    ])
    const s = sessionSummary('d1')
    expect(s.count).toBe(4)
    expect(s.accuracy).toBe(100)
    expect(s.again).toBe(0)
    expect(s.durationMs).toBe(60_000)
    expect(s.prev.count).toBe(3)
    expect(s.prev.accuracy).toBe(67)
    expect(s.prev.again).toBe(1)
    expect(s.delta).toEqual({ count: 1, durationMs: -60_000, accuracy: 33 })
  })

  it('首场会话无可比者，delta 为 null——不编造比较', () => {
    readEvents.mockReturnValue([ev({ timestamp: t, deckId: 'd1', quality: 5 })])
    const s = sessionSummary('d1')
    expect(s.count).toBe(1)
    expect(s.prev).toBeNull()
    expect(s.delta).toBeNull()
  })

  it('只比同册；他册之会话不入', () => {
    readEvents.mockReturnValue([
      ev({ timestamp: t - 2 * HOUR, deckId: 'other', quality: 5 }),
      ev({ timestamp: t, deckId: 'd1', quality: 5 }),
    ])
    expect(sessionSummary('d1').prev).toBeNull()
  })

  it('该册无事件者得 null', () => {
    expect(sessionSummary('d1')).toBeNull()
  })
})
