// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addDocument: vi.fn(),
  addCollection: vi.fn(),
  deleteCollection: vi.fn(),
  navigate: vi.fn(),
  readFileAsDocument: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children }) => <span>{children}</span>,
  useLocation: () => ({ pathname: '/import', search: '?tab=reading', state: null }),
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams('tab=reading')],
}))

vi.mock('../reading/lib/storage', () => ({
  getCollections: () => [{ id: 'collection-1', name: '文集', icon: '书' }],
  addCollection: mocks.addCollection,
  addDocument: mocks.addDocument,
  deleteCollection: mocks.deleteCollection,
}))
vi.mock('../reading/lib/importer', () => ({
  ACCEPT: '.md,.txt',
  readFileAsDocument: mocks.readFileAsDocument,
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

import Import from './Import'

function deferred() {
  let resolve
  const promise = new Promise(res => { resolve = res })
  return { promise, resolve }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.readFileAsDocument.mockResolvedValue({ title: '导入文档', content: '正文', format: 'md' })
  mocks.addCollection.mockReturnValue({ id: 'temporary-collection' })
  mocks.addDocument.mockResolvedValue({ id: 'doc-1' })
})

afterEach(cleanup)

describe('reading import commit guard', () => {
  it('disables cancel/back/fields, exposes pending state, and prevents confirm re-entry', async () => {
    const commit = deferred()
    mocks.addDocument.mockReturnValueOnce(commit.promise)
    const { container } = render(<Import />)
    const fileInput = container.querySelector('input[type="file"]')
    fireEvent.change(fileInput, { target: { files: [new File(['正文'], 'doc.md')] } })

    await screen.findByText('阅读文档预览')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'collection-1' } })
    const confirm = screen.getByRole('button', { name: '确认导入' })
    fireEvent.click(confirm)

    const pending = screen.getByRole('button', { name: '导入中…' })
    expect(pending.disabled).toBe(true)
    expect(pending.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('button', { name: '取消' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '返回' }).disabled).toBe(true)
    expect(screen.getByRole('combobox').disabled).toBe(true)
    fireEvent.click(pending)
    expect(mocks.addDocument).toHaveBeenCalledTimes(1)
    expect(mocks.navigate).not.toHaveBeenCalled()

    commit.resolve({ id: 'doc-1' })
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/?tab=reading'))
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
  })

  it('removes a newly created empty collection when its document body fails', async () => {
    mocks.addDocument.mockRejectedValueOnce(new Error('body failed'))
    const { container } = render(<Import />)
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['正文'], 'doc.md')] },
    })

    await screen.findByText('阅读文档预览')
    fireEvent.change(screen.getByPlaceholderText('新集合名称'), { target: { value: '临时文集' } })
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))

    await waitFor(() => expect(mocks.deleteCollection).toHaveBeenCalledWith('temporary-collection'))
    expect(mocks.showToast).toHaveBeenCalledWith('文档未能写入存储，导入尚未完成')
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(screen.getByText('阅读文档预览')).not.toBeNull()
  })

  it('does not navigate a stale completion after the import page has unmounted', async () => {
    const commit = deferred()
    mocks.addDocument.mockReturnValueOnce(commit.promise)
    const { container, unmount } = render(<Import />)
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['正文'], 'doc.md')] },
    })

    await screen.findByText('阅读文档预览')
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'collection-1' } })
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))
    unmount()
    commit.resolve({ id: 'doc-1' })
    await commit.promise
    await Promise.resolve()

    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(mocks.showToast).not.toHaveBeenCalled()
  })
})
