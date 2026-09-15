// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Showroom from './Showroom'
import { createMemoryAdapter } from './adapter'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('keeps save failures retryable without duplicating successful cards', () => {
  const adapter = createMemoryAdapter({ failOnce: true })
  const draft = { front: '为什么？', back: '两个方向相乘。' }
  expect(() => adapter.save(draft)).toThrow('保存失败')
  expect(adapter.list()).toEqual([])
  expect(adapter.save(draft).id).toBe('specimen-card-1')
  expect(adapter.list()).toHaveLength(1)
  expect(createMemoryAdapter().list()).toEqual([])
})

it('renders real panels and retains edited draft on failure, then resets memory without storage', async () => {
  const get = vi.spyOn(Storage.prototype, 'getItem')
  const put = vi.spyOn(Storage.prototype, 'setItem')
  const remove = vi.spyOn(Storage.prototype, 'removeItem')
  const db = vi.fn(() => { throw new Error('Production database reached') })
  vi.stubGlobal('indexedDB', { open: db })
  render(<Showroom />)
  fireEvent.change(screen.getByLabelText('场景'), { target: { value: 'failed' } })
  await waitFor(() => expect(document.querySelector('.showroom-article .katex')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: '将摘录 1 制成卡片' }))
  await screen.findByLabelText('问题')
  fireEvent.change(screen.getByLabelText('问题'), { target: { value: '保留这个问题' } })
  fireEvent.submit(screen.getByRole('form', { name: '卡片草稿' }))
  expect((await screen.findByRole('alert')).textContent).toContain('输入已保留')
  expect(screen.getByLabelText('问题').value).toBe('保留这个问题')
  fireEvent.submit(screen.getByRole('form', { name: '卡片草稿' }))
  expect((await screen.findByRole('region', { name: '已保存卡片' })).textContent).toContain('保留这个问题')
  fireEvent.click(screen.getByRole('button', { name: '重置场景' }))
  expect(screen.queryByRole('region', { name: '已保存卡片' })).toBeNull()
  expect(get).not.toHaveBeenCalled(); expect(put).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled(); expect(db).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

it('returns to the second repeated paragraph and reports a missing source without losing quote', async () => {
  Element.prototype.scrollIntoView = vi.fn()
  render(<Showroom />)
  fireEvent.change(screen.getByLabelText('场景'), { target: { value: 'repeat' } })
  await waitFor(() => expect(document.querySelector('.showroom-article')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: '将摘录 1 制成卡片' }))
  fireEvent.click(await screen.findByRole('button', { name: '保存卡片' }))
  await screen.findByRole('region', { name: '已保存卡片' })
  fireEvent.click(screen.getByRole('button', { name: '查看原文' }))
  await waitFor(() => expect(document.querySelector('.source-lens article')).toBeTruthy())
  const matches = [...document.querySelectorAll('.source-lens article p')].filter(p => p.textContent === '记住结论并不等于能够解释结论。')
  expect(matches).toHaveLength(2)
  expect(document.activeElement).toBe(matches[1])
  fireEvent.click(screen.getByRole('button', { name: '返回卡片' }))
  fireEvent.change(screen.getByLabelText('场景'), { target: { value: 'missing' } })
  fireEvent.click(screen.getByRole('button', { name: '将摘录 1 制成卡片' }))
  fireEvent.click(await screen.findByRole('button', { name: '保存卡片' }))
  await screen.findByRole('region', { name: '已保存卡片' })
  fireEvent.click(screen.getByRole('button', { name: '查看原文' }))
  expect(await screen.findByText('原材料已不存在，摘句仍保留。关闭可返回卡片。')).toBeTruthy()
  expect(screen.getByRole('region', { name: '已保存卡片' }).textContent).toContain('记住结论')
})
it('uses the shared study tray without accessing production storage', () => {
  const get = vi.spyOn(Storage.prototype, 'getItem')
  const put = vi.spyOn(Storage.prototype, 'setItem')
  render(<Showroom/> )
  fireEvent.change(screen.getByLabelText('场景'), { target: { value: 'plan' } })
  fireEvent.click(screen.getByRole('button', { name: '加入资料' }))
  fireEvent.click(screen.getByRole('checkbox', { name: '文档 · 线性变换与面积' }))
  fireEvent.click(screen.getByRole('button', { name: '加入 1 项' }))
  expect(screen.getByText('当前：线性变换与面积')).not.toBeNull()
  expect(get).not.toHaveBeenCalled(); expect(put).not.toHaveBeenCalled()
})
