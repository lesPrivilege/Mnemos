// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import RatingRail from './RatingRail'
afterEach(cleanup)
it('preview changes do not commit; confirmation and direct buttons retain discrete quality', () => {
  const onRate = vi.fn()
  render(<RatingRail onRate={onRate}/>)
  fireEvent.click(screen.getByText('滑动预选评价'))
  fireEvent.change(screen.getByRole('slider'), { target: { value: '1' } })
  fireEvent.pointerUp(screen.getByRole('slider'))
  expect(onRate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '确认困难' }))
  expect(onRate).toHaveBeenLastCalledWith(2)
  fireEvent.click(screen.getByRole('button', { name: '容易' }))
  expect(onRate).toHaveBeenLastCalledWith(5)
})
