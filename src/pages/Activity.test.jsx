// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const activityCss = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

const fixtures = vi.hoisted(() => {
  const days = Array.from({ length: 90 }, (_, index) => {
    const day = new Date(2026, 7, 20)
    day.setDate(day.getDate() - (89 - index))
    const date = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-')
    return { date, recall: index === 5 ? 2 : 0, practice: index === 5 ? 1 : 0, reading: index === 5 ? 8 : 0, total: index === 5 ? 11 : 0 }
  })
  return {
    days,
    dashboard: {
      streak: 3,
      monthActiveDays: 2,
      weekActiveDays: 1,
      today: { recall: 1, practice: 2, reading: 5 },
      targets: { recall: 20, practice: 20, reading: 30 },
      totals: { recall: 4, recallCorrect: 3, practice: 5, practiceCorrect: 4, reading: 18 },
    },
  }
})

vi.mock('../lib/activity', () => ({
  getActivityDashboard: () => fixtures.dashboard,
  getHeatmapData: () => ({ days: fixtures.days, maxTotal: 11 }),
}))
vi.mock('../components/FocusHeader', () => ({ FocusHeader: ({ label, value }) => <div>{label} {value}</div> }))
vi.mock('../components/Icons', () => ({ CheckIcon: () => <span aria-hidden="true">✓</span> }))

import Activity from './Activity'

afterEach(cleanup)

describe('Activity heatmap accessible date path', () => {
  it('keeps the dense grid visual-only and exposes one 44px native date selector', () => {
    render(<Activity />)

    const heatmapSection = document.querySelector('.activity-section')
    const select = screen.getByRole('combobox', { name: '选择日期' })
    const cells = [...document.querySelectorAll('.activity-heatmap-cell')]
    const scroller = document.querySelector('.activity-heatmap-scroll')

    expect(heatmapSection?.classList.contains('act-section')).toBe(true)
    expect(heatmapSection?.style.background).toBe('')
    expect(cells).toHaveLength(90)
    expect(scroller.getAttribute('aria-hidden')).toBe('true')
    expect(cells.every(cell => cell.getAttribute('role') === null)).toBe(true)
    expect(select.options).toHaveLength(91)
    expect(select.tabIndex).toBe(0)
    expect(document.querySelector('.activity-detail')?.getAttribute('aria-live')).toBe('polite')
    expect(document.querySelector('.activity-detail')?.textContent).toBe('')
    expect(activityCss).toMatch(/\.activity-date-picker\s*\{[\s\S]*max-width: 100%;/)
    expect(activityCss).toMatch(/\.activity-date-picker select\s*\{[\s\S]*min-height: var\(--hit-target\);/)
    expect(getComputedStyle(scroller).overflowX).toBe('auto')
  })

  it('syncs select and visual date selection to the same detail line', () => {
    render(<Activity />)
    const select = screen.getByRole('combobox', { name: '选择日期' })
    const target = fixtures.days[5]
    const other = fixtures.days[6]

    fireEvent.change(select, { target: { value: target.date } })
    expect(select.value).toBe(target.date)
    expect(document.querySelector('.activity-detail')?.textContent).toContain(target.date)
    expect(document.querySelector('.activity-detail')?.textContent).toContain('记忆 2')
    expect(document.querySelector('.activity-detail')?.textContent).toContain('练习 1')
    expect(document.querySelector('.activity-detail')?.textContent).toContain('阅读 8 min')

    fireEvent.click(document.querySelector(`.activity-heatmap-cell[title^="${other.date}"]`))
    expect(select.value).toBe(other.date)
    expect(document.querySelector('.activity-detail')?.textContent).toContain(other.date)
    expect(document.querySelector('.activity-detail')?.textContent).not.toContain('记忆 2')
  })
})
