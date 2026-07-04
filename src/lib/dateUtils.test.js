import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatLocalDate, isoToLocalDate, localDow, localToday, parseLocalDate } from './dateUtils'

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 9, 30))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats today from the local calendar date', () => {
    expect(localToday()).toBe('2026-05-03')
  })

  it('formats Date instances as local YYYY-MM-DD strings', () => {
    expect(formatLocalDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09')
  })

  it('parses date-only strings as local dates', () => {
    const date = parseLocalDate('2026-05-03')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(4)
    expect(date.getDate()).toBe(3)
    expect(localDow('2026-05-03')).toBe(0)
  })

  it('converts ISO datetimes back to the local date', () => {
    const iso = new Date(2026, 4, 3, 9, 30).toISOString()
    expect(isoToLocalDate(iso)).toBe('2026-05-03')
  })
})
