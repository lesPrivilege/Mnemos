// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))

    const starredMenuItem = screen.getByRole('menuitem', { name: '收藏' })
    expect(starredMenuItem.getAttribute('href')).toBe('/starred?subject=%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
  })

  it('keeps import in the top-bar menu and makes the menu state inert and dismissible', () => {
    renderSet({ choice: 1 })

    fireEvent.click(screen.getByRole('button', { name: '更多操作' }))
    const importMenuItem = screen.getByRole('menuitem', { name: /导入/ })
    expect(importMenuItem.getAttribute('href')).toBe(importPath)
    expect(importMenuItem.dataset.routerState).toContain(subjectPath)
    expect(screen.getByRole('main').getAttribute('inert')).toBe('')
    expect(document.querySelector('.floating-bar')?.getAttribute('inert')).toBe('')

    fireEvent.click(screen.getByRole('button', { name: '关闭菜单' }))
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.getByRole('main').getAttribute('inert')).toBeNull()
  })
})
