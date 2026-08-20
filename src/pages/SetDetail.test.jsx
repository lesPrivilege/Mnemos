// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  chapters: [],
  questions: [],
  progress: {},
  starred: [],
  stats: { total: 0, done: 0, correct: 0, wrong: 0 },
}))

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, state: linkState, children, ...props }) => (
    <a href={to} data-router-state={linkState ? JSON.stringify(linkState) : undefined} {...props}>{children}</a>
  ),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ subject: '数学/基础' }),
}))

vi.mock('../quiz/lib/storage', () => ({
  clearSubjectProgress: vi.fn(),
  deleteSubject: vi.fn(),
  getChapterList: () => state.chapters,
  getSubjectStats: () => state.stats,
  loadProgress: () => state.progress,
  loadQuestions: () => state.questions,
  loadStarred: () => state.starred,
}))

vi.mock('../quiz/lib/subjectNames', () => ({
  getSubjectDisplayName: (subject) => subject,
}))

vi.mock('../lib/useBackButton', () => ({
  useBackButton: () => ({ goBack: vi.fn() }),
}))

vi.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: () => null,
  useConfirm: () => ({ confirmState: null, confirm: mocks.confirm }),
}))

vi.mock('../components/StructureTree', () => ({
  default: () => null,
}))

import SetDetail from './SetDetail'

const subjectPath = '/set/%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80'
const importPath = '/import?tab=json'

function renderSet({ choice = 0, review = 0, wrong = 0, wrongBook = false, starredIds = [] } = {}) {
  state.chapters = choice + review > 0
    ? [{ name: '第一章', total: choice + review, done: 0, correct: 0, wrong, choice, review }]
    : []
  state.questions = wrongBook || starredIds.length > 0
    ? [{ id: 'q1', subject: '数学/基础', chapter: '第一章', type: 'choice', question: '题目' }]
    : []
  state.progress = wrongBook
    ? { q1: { status: 'correct', wrong_count: 1, rightStreak: 1 } }
    : {}
  state.starred = starredIds
  state.stats = { total: choice + review, done: 0, correct: 0, wrong }
  return render(<SetDetail />)
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.confirm.mockResolvedValue(true)
})

afterEach(cleanup)

describe('SetDetail FloatingBar actions', () => {
  it('keeps choice practice as the primary action and uses only the choice count for mixed sets', () => {
    renderSet({ choice: 3, review: 2 })

    const primary = screen.getByRole('button', { name: /开始选择题/ })
    fireEvent.click(primary)

    expect(mocks.navigate).toHaveBeenCalledWith('/quiz/%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
    expect(primary.querySelector('.num')?.textContent).toBe('3')
    expect(document.querySelectorAll('.dd-action')).toHaveLength(0)
    expect(screen.queryByText('收藏')).toBeNull()
  })

  it('uses the review route when a set has only review questions', () => {
    renderSet({ review: 2 })

    const primary = screen.getByRole('button', { name: /开始解答题/ })
    fireEvent.click(primary)

    expect(mocks.navigate).toHaveBeenCalledWith('/quiz-review/%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
    expect(primary.querySelector('.num')?.textContent).toBe('2')
  })

  it('turns the empty state into a usable contextual import link', () => {
    renderSet()

    const importLink = screen.getByRole('link', { name: /导入题库/ })
    expect(importLink.getAttribute('href')).toBe(importPath)
    expect(importLink.dataset.routerState).toContain(subjectPath)
    expect(importLink.className).toContain('dd-cta-main')
    expect(screen.queryByText('暂无题目')).toBeNull()
  })

  it('keeps one full-width wrong-book action only when wrong questions exist', () => {
    renderSet({ choice: 2, wrongBook: true })

    const actions = document.querySelectorAll('.dd-action')
    expect(actions).toHaveLength(1)
    expect(actions[0].className).toContain('dd-action-wide')
    expect(actions[0].textContent).toContain('错题 · 1')
    expect(actions[0].parentElement?.className).toContain('floating-bar')
    expect(actions[0].getAttribute('href')).toBe('/wrong?subject=%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
    expect(screen.queryByText('收藏')).toBeNull()
    expect(screen.queryByText('导入')).toBeNull()
  })

  it('keeps starred questions in the top-bar menu without duplicating the floating action', () => {
    renderSet({ choice: 1, starredIds: ['q1'] })

    expect(document.querySelectorAll('.dd-action')).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /收藏/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))

    const starredMenuItem = screen.getByRole('link', { name: '收藏' })
    expect(starredMenuItem.getAttribute('href')).toBe('/starred?subject=%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
  })

  it('filters chapter rows and expanded sub-actions by the selected question type', () => {
    state.chapters = [
      { name: '第一章', total: 3, done: 0, correct: 0, wrong: 0, choice: 2, review: 1 },
      { name: '第二章', total: 1, done: 0, correct: 0, wrong: 0, choice: 0, review: 1 },
    ]
    state.questions = [
      { id: 'choice-1', subject: '数学/基础', chapter: '第一章', type: 'choice', question: '选择一' },
      { id: 'choice-2', subject: '数学/基础', chapter: '第一章', type: 'choice', question: '选择二' },
      { id: 'review-1', subject: '数学/基础', chapter: '第一章', type: 'review', question: '解答一' },
      { id: 'review-2', subject: '数学/基础', chapter: '第二章', type: 'review', question: '解答二' },
    ]
    state.stats = { total: 4, done: 0, correct: 0, wrong: 0 }
    state.progress = {}
    state.starred = []
    render(<SetDetail />)

    fireEvent.click(screen.getByRole('button', { name: '选择 · 2' }))
    expect(screen.getByText('第一章')).toBeTruthy()
    expect(screen.queryByText('第二章')).toBeNull()

    fireEvent.click(screen.getByText('第一章'))
    expect(screen.getByText('选择题 (2题)')).toBeTruthy()
    expect(screen.queryByText('解答题 (1题)')).toBeNull()
  })

  it('counts only visible-type stars on filtered chapter rows', () => {
    state.chapters = [{ name: '第一章', total: 2, done: 0, correct: 0, wrong: 0, choice: 1, review: 1 }]
    state.questions = [
      { id: 'choice-1', subject: '数学/基础', chapter: '第一章', type: 'choice', question: '选择一' },
      { id: 'review-1', subject: '数学/基础', chapter: '第一章', type: 'review', question: '解答一' },
    ]
    state.stats = { total: 2, done: 0, correct: 0, wrong: 0 }
    state.progress = {}
    state.starred = ['review-1']
    render(<SetDetail />)

    fireEvent.click(screen.getByRole('button', { name: '选择 · 1' }))
    const chapterRow = screen.getByText('第一章').closest('.card-row')
    expect(chapterRow?.textContent).not.toContain('★')
  })

  it('keeps import in the top-bar menu and makes the menu state inert and dismissible', async () => {
    renderSet({ choice: 1 })

    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)
    const importMenuItem = screen.getByRole('link', { name: /导入/ })
    expect(importMenuItem.getAttribute('href')).toBe(importPath)
    expect(importMenuItem.dataset.routerState).toContain(subjectPath)
    expect(screen.getByRole('main').getAttribute('inert')).toBe('')
    expect(document.querySelector('.floating-bar')?.getAttribute('inert')).toBe('')

    const dismiss = screen.getByRole('button', { name: '关闭菜单' })
    expect(dismiss.classList.contains('menu-backdrop')).toBe(true)
    fireEvent.click(dismiss)
    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(screen.getByRole('main').getAttribute('inert')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('enters the operation group, traps focus, and restores the trigger on Escape', async () => {
    renderSet({ choice: 1 })
    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)

    const group = await screen.findByRole('group', { name: '更多操作' })
    const items = [...group.querySelectorAll('a[href], button:not([disabled])')]
    await waitFor(() => expect(document.activeElement).toBe(items[0]))
    const topbar = document.querySelector('.topbar')
    const backgroundButtons = [...topbar.querySelectorAll('button')].filter(button => !group.contains(button))
    expect(backgroundButtons.length).toBeGreaterThan(0)
    expect(backgroundButtons.every(button => button.hasAttribute('inert'))).toBe(true)
    expect(topbar.querySelector('h1')?.getAttribute('aria-hidden')).toBe('true')
    expect(items.every(item => !item.hasAttribute('inert'))).toBe(true)
    const dismiss = screen.getByRole('button', { name: '关闭菜单' })
    expect(dismiss.classList.contains('menu-backdrop')).toBe(true)
    expect(dismiss.className).toContain('fixed')
    expect(dismiss.className).toContain('inset-0')
    expect(dismiss.closest('.topbar')).toBeNull()
    expect(dismiss.tabIndex).toBe(-1)
    fireEvent.keyDown(items[0], { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(items[items.length - 1])
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('closes the menu before confirming a destructive action and pins return focus', async () => {
    renderSet({ choice: 1 })
    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)

    await screen.findByRole('group', { name: '更多操作' })
    const decision = new Promise(() => {})
    mocks.confirm.mockReturnValueOnce(decision)
    fireEvent.click(screen.getByRole('button', { name: '删除科目' }))

    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ returnFocus: trigger }))
  })
})
