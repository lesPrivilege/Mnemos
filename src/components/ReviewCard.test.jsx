// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ReviewCard from './ReviewCard'
vi.mock('../lib/useRenderedMarkdown', () => ({ useRenderedMarkdown: text => `<p>${text}</p>` }))
afterEach(cleanup)
const card = { id: 'c', front: '为什么要主动回忆？', back: '因为提取本身会强化记忆。' }
it('keeps one question node, reveals an accessible answer and focuses it', () => {
  const onFlip = vi.fn()
  const { rerender } = render(<ReviewCard card={card} flipped={false} onFlip={onFlip} />)
  const question = screen.getByText(card.front)
  expect(screen.queryByRole('region', { name: '答案' })).toBeNull()
  fireEvent.click(question)
  expect(onFlip).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
  expect(onFlip).toHaveBeenCalledWith(true)
  rerender(<ReviewCard card={card} flipped onFlip={onFlip} />)
  expect(screen.getByText(card.front)).toBe(question)
  expect(screen.getAllByText(card.front)).toHaveLength(1)
  expect(document.activeElement).toBe(screen.getByRole('region', { name: '答案' }))
  fireEvent.click(screen.getByRole('button', { name: '收起答案' }))
  expect(onFlip).toHaveBeenLastCalledWith(false)
})
