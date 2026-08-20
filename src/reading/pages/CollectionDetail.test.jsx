// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ docs: [] }))
const mocks = vi.hoisted(() => ({
  addDocument: vi.fn(),
  confirm: vi.fn(),
  deleteDocument: vi.fn(),
  navigate: vi.fn(),
  readFileAsDocument: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'collection-1' }),
  useNavigate: () => mocks.navigate,
}))

vi.mock('../lib/storage', () => ({
  getCollection: () => ({ id: 'collection-1', name: '文集', pinned: false }),
  getDocumentsByCollection: () => state.docs,
  addDocument: mocks.addDocument,
  deleteDocument: mocks.deleteDocument,
  deleteCollection: vi.fn(),
  toggleCollectionPin: vi.fn(),
}))

vi.mock('../lib/importer', () => ({ readFileAsDocument: mocks.readFileAsDocument }))
vi.mock('../../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: vi.fn() }) }))
vi.mock('../../components/Toast', () => ({
  useToast: () => ({ toast: null, showToast: mocks.showToast }),
  Toast: () => null,
}))
vi.mock('../../components/ConfirmSheet', () => ({
  useConfirm: () => ({ confirmState: null, confirm: mocks.confirm }),
  ConfirmSheet: () => null,
}))

import CollectionDetail from './CollectionDetail'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  state.docs = []
  mocks.addDocument.mockResolvedValue({ id: 'doc-new' })
  mocks.confirm.mockResolvedValue(true)
  mocks.deleteDocument.mockResolvedValue({ ok: true })
  mocks.readFileAsDocument.mockResolvedValue({ title: '导入文档', content: '正文', format: 'md' })
})

afterEach(cleanup)

describe('CollectionDetail document mutation guards', () => {
  it('enters the operation group, traps focus, and restores the trigger on Escape', async () => {
    render(<CollectionDetail />)
    const trigger = await screen.findByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)

    const group = await screen.findByRole('group', { name: '更多操作' })
    const item = within(group).getByRole('button', { name: '置顶集合' })
    await waitFor(() => expect(document.activeElement).toBe(item))
    const topbar = document.querySelector('.topbar')
    const backgroundButtons = [...topbar.querySelectorAll('button')].filter(button => !group.contains(button))
    expect(backgroundButtons.length).toBeGreaterThan(0)
    expect(backgroundButtons.every(button => button.hasAttribute('inert'))).toBe(true)
    expect(topbar.querySelector('h1')?.getAttribute('aria-hidden')).toBe('true')
    expect(item.hasAttribute('inert')).toBe(false)
    const dismiss = screen.getByRole('button', { name: '关闭菜单' })
    expect(dismiss.classList.contains('menu-backdrop')).toBe(true)
    expect(dismiss.className).toContain('fixed')
    expect(dismiss.className).toContain('inset-0')
    expect(dismiss.closest('.topbar')).toBeNull()
    expect(dismiss.tabIndex).toBe(-1)
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('shows saving state and prevents add re-entry until durable completion', async () => {
    const commit = deferred()
    mocks.addDocument.mockReturnValueOnce(commit.promise)
    render(<CollectionDetail />)

    fireEvent.click(screen.getByRole('button', { name: '新建' }))
    fireEvent.change(screen.getByPlaceholderText('文档标题'), { target: { value: '标题' } })
    fireEvent.change(screen.getByPlaceholderText('文档内容（Markdown）'), { target: { value: '正文' } })
    const create = screen.getAllByRole('button', { name: '创建' })
      .find(button => button.classList.contains('btn-primary'))
    fireEvent.click(create)

    const pending = screen.getByRole('button', { name: '保存中…' })
    expect(pending.disabled).toBe(true)
    expect(pending.getAttribute('aria-busy')).toBe('true')
    fireEvent.click(pending)
    expect(mocks.addDocument).toHaveBeenCalledTimes(1)

    commit.resolve({ id: 'doc-new' })
    await waitFor(() => expect(screen.queryByPlaceholderText('文档标题')).toBeNull())
  })

  it('shows importing state and ignores a second file event while parsing', async () => {
    const parsed = deferred()
    mocks.readFileAsDocument.mockReturnValueOnce(parsed.promise)
    const { container } = render(<CollectionDetail />)
    const input = container.querySelector('input[type="file"]')

    fireEvent.change(input, { target: { files: [new File(['one'], 'one.md')] } })
    const pending = screen.getByRole('button', { name: '导入中…' })
    expect(pending.disabled).toBe(true)
    expect(pending.getAttribute('aria-busy')).toBe('true')
    fireEvent.change(input, { target: { files: [new File(['two'], 'two.md')] } })
    expect(mocks.readFileAsDocument).toHaveBeenCalledTimes(1)

    parsed.resolve({ title: '导入文档', content: '正文', format: 'md' })
    await waitFor(() => expect(screen.getByRole('button', { name: '导入' }).disabled).toBe(false))
    expect(mocks.addDocument).toHaveBeenCalledTimes(1)
  })

  it('guards the confirmation and delete request as one pending operation', async () => {
    state.docs = [{
      id: 'doc-1', title: '待删文档', format: 'md', createdAt: '2026-08-20T00:00:00.000Z', lastReadAt: null,
    }]
    const decision = deferred()
    const deletion = deferred()
    mocks.confirm.mockReturnValueOnce(decision.promise)
    mocks.deleteDocument.mockReturnValueOnce(deletion.promise)
    render(<CollectionDetail />)

    const deleteButton = screen.getByRole('button', { name: '删除文档「待删文档」' })
    fireEvent.click(deleteButton)
    expect(screen.getByText('删除中…')).not.toBeNull()
    expect(deleteButton.disabled).toBe(true)
    fireEvent.click(deleteButton)
    expect(mocks.confirm).toHaveBeenCalledTimes(1)

    decision.resolve(true)
    await waitFor(() => expect(mocks.deleteDocument).toHaveBeenCalledTimes(1))
    deletion.resolve({ ok: true })
    await waitFor(() => expect(deleteButton.disabled).toBe(false))
  })
})
