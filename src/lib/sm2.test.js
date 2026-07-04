import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sm2 } from './sm2'

const baseCard = {
  easiness: 2.5,
  interval: 0,
  repetitions: 0,
}

describe('sm2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('schedules the first good review for tomorrow without changing easiness', () => {
    expect(sm2(baseCard, 4)).toMatchObject({
      easiness: 2.5,
      interval: 1,
      repetitions: 1,
      dueDate: '2026-05-04',
    })
  })

  it('uses the six-day second successful interval', () => {
    expect(sm2({ ...baseCard, interval: 1, repetitions: 1 }, 4)).toMatchObject({
      interval: 6,
      repetitions: 2,
      dueDate: '2026-05-09',
    })
  })

  it('shortens hard reviews while still advancing repetitions', () => {
    expect(sm2({ ...baseCard, interval: 5, repetitions: 2 }, 2)).toMatchObject({
      easiness: 2.18,
      interval: 6,
      repetitions: 3,
      dueDate: '2026-05-09',
    })
  })

  it('resets again reviews and never drops easiness below the floor', () => {
    expect(sm2({ ...baseCard, easiness: 1.35, interval: 30, repetitions: 4 }, 1)).toMatchObject({
      easiness: 1.3,
      interval: 1,
      repetitions: 0,
      dueDate: '2026-05-04',
    })
  })
})
