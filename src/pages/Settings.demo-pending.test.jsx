// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ seedDemoContent: vi.fn(), showToast: vi.fn() }))

vi.mock('../lib/demoContent', () => ({ seedDemoContent: mocks.seedDemoContent }))
vi.mock('../quiz/lib/storage', () => ({
  clearAllProgress: vi.fn(),
  clearQuestions: vi.fn(),
  deleteSubject: vi.fn(),
  clearSubjectProgress: vi.fn(),
  getStorageStats: () => ({ total: 0 }),
  getSubjectList: () => [],
  exportData: () => '{}',
}))
vi.mock('../lib/scheduler', () => ({ getAllDeckStats: () => [] }))
vi.mock('../reading/lib/storage', () => ({ getCollections: () => [], getDocuments: () => [] }))
vi.mock('../reading/lib/highlights', () => ({ getAllHighlights: () => [] }))
vi.mock('../reading/lib/bookmarks', () => ({ getAllBookmarks: () => [] }))
vi.mock('../reading/lib/stats', () => ({ getReadingStats: () => ({ totalMinutes: 0, docsCompleted: 0 }) }))
vi.mock('../lib/quarantine', () => ({
  discardQuarantined: vi.fn(),
  getQuarantinedRaw: vi.fn(),
  listQuarantined: () => [],
}))
vi.mock('../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: vi.fn() }) }))
vi.mock('../components/Toast', () => ({
  useToast: () => ({ toast: null, showToast: mocks.showToast }),
  Toast: () => null,
}))
vi.mock('../components/ConfirmSheet', () => ({
  useConfirm: () => ({ confirmState: null, confirm: vi.fn() }),
  ConfirmSheet: () => null,
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))

import Settings from './Settings'

function deferred() {
  let resolve
  const promise = new Promise(res => { resolve = res })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  const values = new Map()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn(key => values.delete(key)),
  })
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  mocks.seedDemoContent.mockResolvedValue({ total: 0 })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Settings demo seed guard', () => {
  it('shows a disabled pending action and prevents re-entry', async () => {
    const seed = deferred()
    mocks.seedDemoContent.mockReturnValueOnce(seed.promise)
    render(<Settings />)

    fireEvent.click(screen.getByRole('button', { name: '载入' }))
    const pending = screen.getByRole('button', { name: '载入中…' })
    expect(pending.disabled).toBe(true)
    expect(pending.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(pending)
    expect(mocks.seedDemoContent).toHaveBeenCalledTimes(1)

    seed.resolve({ total: 1 })
    await waitFor(() => expect(screen.getByRole('button', { name: '载入' }).disabled).toBe(false))
    expect(mocks.showToast).toHaveBeenCalledWith('已载入 1 项示例内容')
  })
})
