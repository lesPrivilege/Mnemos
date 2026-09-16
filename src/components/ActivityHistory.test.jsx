// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import ActivityHistory from './ActivityHistory'
afterEach(cleanup)
const days = [
  { date: '2026-09-14', recall: 2, practice: 0, reading: 0, total: 2, recorded: { recall: true, practice: false, reading: true } },
  { date: '2026-09-15', recall: 0, practice: 3, reading: 5, total: 8, recorded: { recall: false, practice: true, reading: true } },
  { date: '2026-09-16', recall: 0, practice: 0, reading: 0, total: 0, recorded: {} },
]
it('filters inclusive days in both heatmap and details, distinguishes zero, and clears to prior scroll', () => {
  const { container } = render(<ActivityHistory days={days}/>)
  const scroller = container.querySelector('.activity-heatmap-scroll'); scroller.scrollLeft = 42
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-09-14' } })
  fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2026-09-15' } })
  expect(container.querySelectorAll('.selected')).toHaveLength(2)
  const rows = screen.getAllByRole('row')
  expect(rows).toHaveLength(3)
  expect(within(rows[1]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['2', '—', '0'])
  scroller.scrollLeft = 100
  fireEvent.click(screen.getByRole('button', { name: '清除筛选' }))
  expect(screen.queryByRole('table')).toBeNull()
  expect(scroller.scrollLeft).toBe(42)
})
it('heatmap click selects one day; reversed and outside-window ranges are explicit', () => {
  const { container } = render(<ActivityHistory days={days}/>)
  fireEvent.click(container.querySelectorAll('.activity-heatmap-cell')[1])
  expect(screen.getByLabelText('开始日期').value).toBe('2026-09-15')
  expect(screen.getAllByRole('row')).toHaveLength(2)
  fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2026-09-14' } })
  expect(screen.getByRole('alert').textContent).toContain('不能早于')
  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2027-01-01' } })
  fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2027-01-02' } })
  expect(screen.getByText('所选范围不在当前 90 天记录窗口内。')).not.toBeNull()
})
