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
    render(
      <ReviewCard card={card} flipped={false} onFlip={onFlip} swipeOffset={0} />
    )

    expect(screen.getByText('轻点显示答案')).not.toBeNull()
    expect(document.querySelector('.flip-inner').classList.contains('flipped')).toBe(false)

    // 容器不再靠 aria-label 命名：可及名由当前可见面的内容自然算出，
    // 这里只断言问面文本可见、翻面前 aria-expanded 为 false。
    const flipBtn = screen.getByRole('button')
    expect(flipBtn.getAttribute('aria-expanded')).toBe('false')
    expect(flipBtn.textContent).toContain(card.front)
    fireEvent.click(flipBtn)
    expect(onFlip).toHaveBeenCalledWith(true)
  })

  it('答面以朱印标答，并保留问题作对照', () => {
    render(
      <ReviewCard card={card} flipped onFlip={() => {}} swipeOffset={0} />
    )

    expect(document.querySelector('.flip-inner').classList.contains('flipped')).toBe(true)
    // 翻面后 aria-expanded 随之为 true；可及名不再断言固定字符串，
    // 只需确认问题与答案文本仍在可见内容里。
    expect(screen.getByRole('button').getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('.rv-seal').textContent).toBe('答')
    expect(screen.getAllByText('为什么要主动回忆？')).toHaveLength(2)
    expect(screen.getByText('因为提取本身会强化记忆。')).not.toBeNull()
  })
})
