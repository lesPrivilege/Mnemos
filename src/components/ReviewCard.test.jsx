// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReviewCard from './ReviewCard'

vi.mock('../lib/useRenderedMarkdown', () => ({
  useRenderedMarkdown: (text) => `<p>${text}</p>`,
}))

afterEach(cleanup)

const card = {
  front: '为什么要主动回忆？',
  back: '因为提取本身会强化记忆。',
}

describe('ReviewCard', () => {
  it('问面把提示收在卡内，普通点按请求翻面', () => {
    const onFlip = vi.fn()
    const { container } = render(
      <ReviewCard card={card} flipped={false} onFlip={onFlip} swipeOffset={0} />
    )

    expect(screen.getByText('轻点显示答案')).not.toBeNull()
    expect(container.querySelector('.flip-inner').classList.contains('flipped')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '轻点翻面' }))
    expect(onFlip).toHaveBeenCalledWith(true)
  })

  it('答面以朱印标答，并保留问题作对照', () => {
    const { container } = render(
      <ReviewCard card={card} flipped onFlip={() => {}} swipeOffset={0} />
    )

    expect(container.querySelector('.flip-inner').classList.contains('flipped')).toBe(true)
    expect(container.querySelector('.rv-seal').textContent).toBe('答')
    expect(screen.getAllByText('为什么要主动回忆？')).toHaveLength(2)
    expect(screen.getByText('因为提取本身会强化记忆。')).not.toBeNull()
  })
})
