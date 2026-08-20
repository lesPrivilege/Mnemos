// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ starred: false }))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ subject: '数学' }),
  useSearchParams: () => [new URLSearchParams()],
}))

vi.mock('../quiz/lib/quizEngine', () => ({
  getQuizQuestions: ({ type }) => type === 'choice'
    ? [{ id: 'choice-1', subject: '数学', chapter: '第一章', type: 'choice', question: '选择题题面', options: ['A. 选项'], answer: 'A' }]
    : [{ id: 'review-1', subject: '数学', chapter: '第一章', type: 'review', question: '解答题题面', answer: '参考答案' }],
  submitAnswer: vi.fn(),
  markQuestion: vi.fn(() => ({ wrongStreak: 0 })),
  isInWrongBook: vi.fn(() => false),
}))

vi.mock('../quiz/lib/storage', () => ({
  saveLastSession: vi.fn(),
  loadLastSession: vi.fn(() => null),
  clearLastSession: vi.fn(),
  toggleStar: vi.fn(() => {
    state.starred = !state.starred
    return state.starred
  }),
  isStarred: vi.fn(() => state.starred),
  deleteQuestion: vi.fn(),
  loadStarred: vi.fn(() => []),
  loadQuestions: vi.fn(() => []),
}))

vi.mock('../quiz/lib/subjectNames', () => ({ getSubjectDisplayName: subject => subject }))
vi.mock('../quiz/components/RenderMarkdown', () => ({ default: ({ content }) => <span>{content}</span> }))
vi.mock('../lib/derive/events', () => ({ recordEvent: vi.fn() }))
vi.mock('../lib/derive/today', () => ({ todayJourney: () => ({ stages: [] }) }))
vi.mock('../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: vi.fn() }) }))
vi.mock('../quiz/lib/routes', () => ({ buildQuizRoute: (kind, subject) => `/${kind}/${subject}` }))
vi.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: () => null,
  useConfirm: () => ({ confirmState: null, confirm: vi.fn() }),
}))
vi.mock('../lib/haptics', () => ({ hapticLight: vi.fn(), hapticWarning: vi.fn(), hapticSuccess: vi.fn() }))
vi.mock('../components/Icons', () => {
  const icon = () => <svg aria-hidden="true" />
  return {
    BackIcon: icon,
    CheckIcon: icon,
    XIcon: icon,
    StarIcon: icon,
    MoreIcon: icon,
    TrashIcon: icon,
  }
})

import Quiz from './QuizPage'
import ReviewQuestion from './QuizReview'

afterEach(cleanup)

beforeEach(() => {
  state.starred = false
})

describe('quiz session chrome', () => {
  it('keeps choice position in rv-meta and names icon-only controls', async () => {
    render(<Quiz />)

    expect(await screen.findByText('选择题题面')).toBeTruthy()
    expect(document.querySelector('.rv-meta .pos')?.textContent).toBe('01 / 01')
    expect(document.querySelector('.topbar')?.textContent).not.toContain('01 / 01')
    expect(document.querySelector('.qa-card .corner')?.textContent).toBe('选择')
    expect(screen.getByRole('button', { name: '收藏题目' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '更多操作' })).toBeTruthy()
  })

  it('keeps review position in rv-meta and preserves existing icon names', async () => {
    render(<ReviewQuestion />)

    expect(await screen.findByText('解答题题面')).toBeTruthy()
    expect(document.querySelector('.rv-meta .pos')?.textContent).toBe('01 / 01')
    expect(document.querySelector('.topbar')?.textContent).not.toContain('01 / 01')
    expect(document.querySelector('.flip-face .corner')?.textContent).toBe('解答')
    expect(screen.getByRole('button', { name: '收藏题目' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '更多操作' })).toBeTruthy()
  })

  it('keeps the choice operation group modal to the trigger', async () => {
    render(<Quiz />)
    await screen.findByText('选择题题面')
    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)

    const group = await screen.findByRole('group', { name: '更多操作' })
    const item = within(group).getByRole('button', { name: '删除题目' })
    await waitFor(() => expect(document.activeElement).toBe(item))
    const topbar = document.querySelector('.topbar')
    const backgroundButtons = [...topbar.querySelectorAll('button')].filter(button => !group.contains(button))
    expect(backgroundButtons.length).toBeGreaterThan(0)
    expect(backgroundButtons.every(button => button.hasAttribute('inert'))).toBe(true)
    expect(topbar.querySelector('h1')?.getAttribute('aria-hidden')).toBe('true')
    expect(item.hasAttribute('inert')).toBe(false)
    expect(screen.getByRole('main').getAttribute('inert')).toBe('')
    const dismiss = screen.getByRole('button', { name: '关闭菜单' })
    expect(dismiss.classList.contains('menu-backdrop')).toBe(true)
    expect(dismiss.className).toContain('fixed')
    expect(dismiss.className).toContain('inset-0')
    expect(dismiss.closest('.topbar')).toBeNull()
    expect(dismiss.tabIndex).toBe(-1)

    fireEvent.keyDown(item, { key: 'Tab' })
    expect(document.activeElement).toBe(item)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps the review operation group modal to the trigger', async () => {
    render(<ReviewQuestion />)
    await screen.findByText('解答题题面')
    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)

    const group = await screen.findByRole('group', { name: '更多操作' })
    const item = within(group).getByRole('button', { name: '删除题目' })
    await waitFor(() => expect(document.activeElement).toBe(item))
    const topbar = document.querySelector('.topbar')
    const backgroundButtons = [...topbar.querySelectorAll('button')].filter(button => !group.contains(button))
    expect(backgroundButtons.length).toBeGreaterThan(0)
    expect(backgroundButtons.every(button => button.hasAttribute('inert'))).toBe(true)
    expect(item.hasAttribute('inert')).toBe(false)
    expect(document.querySelector('.rv-card-wrap')?.getAttribute('inert')).toBe('')
    const dismiss = screen.getByRole('button', { name: '关闭菜单' })
    expect(dismiss.classList.contains('menu-backdrop')).toBe(true)
    expect(dismiss.className).toContain('fixed')
    expect(dismiss.className).toContain('inset-0')
    expect(dismiss.closest('.topbar')).toBeNull()
    expect(dismiss.tabIndex).toBe(-1)

    fireEvent.keyDown(item, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(item)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })
})
