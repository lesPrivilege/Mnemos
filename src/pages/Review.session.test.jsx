// @vitest-environment jsdom
import { IDBFactory } from 'fake-indexeddb'
import { webcrypto } from 'node:crypto'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
vi.mock('../lib/utils', () => ({ shuffle: list => list }))
vi.mock('../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: vi.fn() }) }))
vi.mock('../lib/haptics', () => ({ hapticLight: vi.fn(), hapticSuccess: vi.fn(), hapticWarning: vi.fn() }))
vi.mock('../lib/derive', () => ({ sessionSummary: () => null, todayFocus: () => ({ primary: null }) }))
vi.mock('../lib/derive/today', () => ({ todayJourney: () => ({ stages: [] }) }))
vi.mock('../lib/useRenderedMarkdown', () => ({ useRenderedMarkdown: text => `<p>${text}</p>` }))
let storage, bigStore, events, session, Review
const card = { id: 'c', deckId: 'd', front: 'Q', back: 'A', repetitions: 3, interval: 12, easiness: 2.5, dueDate: '2020-01-01', lapses: 0 }
beforeEach(async () => {
  vi.resetModules()
  const map = new Map()
  vi.stubGlobal('localStorage', { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) })
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('crypto', webcrypto)
  storage = await import('../lib/storage'); bigStore = await import('../lib/bigStore'); events = await import('../lib/derive/events'); session = await import('../lib/reviewSession')
  Review = (await import('./Review')).default
  await bigStore.hydrate()
  await storage.importDataConfirmed({ decks: [{ id: 'd', name: 'D' }], cards: [card] })
})
afterEach(async () => { cleanup(); await bigStore.flushBigStoreWritesForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function mount() { return render(<MemoryRouter initialEntries={['/review/d']}><Routes><Route path="/review/:id" element={<Review/>}/></Routes></MemoryRouter>) }
it('saves an interrupted first screen and does not mark initial loading complete', async () => {
  const view = mount()
  await screen.findByRole('button', { name: '显示答案' })
  view.unmount()
  expect(session.loadReviewSession()).toMatchObject({ deckId: 'd', dueCount: 1 })
})
it('guards double input and undo restores the final card plus its event', async () => {
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '显示答案' }))
  const button = screen.getByRole('button', { name: '良好' })
  act(() => { fireEvent.click(button); fireEvent.click(button) })
  await screen.findByText('这一轮做完了')
  expect(events.readEvents()).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '撤销上一张' }))
  await screen.findByRole('button', { name: '收起答案' })
  expect(events.readEvents()).toHaveLength(0)
  expect(storage.getCard('c').repetitions).toBe(3)
})
it('requeues mature Again as learning and keeps remaining count accurate', async () => {
  const view = mount()
  fireEvent.click(await screen.findByRole('button', { name: '显示答案' }))
  fireEvent.click(screen.getByRole('button', { name: '重来' }))
  await waitFor(() => expect(storage.getCard('c').repetitions).toBe(0))
  await screen.findByRole('button', { name: '显示答案' })
  expect(screen.getByText('学习中 · 1/2')).not.toBeNull()
  view.unmount()
  expect(session.loadReviewSession().dueCount).toBe(1)
})
it('disables leave and star while a rating is committing; summary keys do not hide the answer', async () => {
  const actionModule = await import('../lib/reviewAction')
  const original = actionModule.commitRating
  let release
  const gate = new Promise(resolve => { release = resolve })
  vi.spyOn(actionModule, 'commitRating').mockImplementation(async (...args) => { await gate; return original(...args) })
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '显示答案' }))
  fireEvent.keyDown(screen.getByText('滑动预选评价'), { key: 'Enter' })
  expect(screen.getByRole('button', { name: '收起答案' })).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '良好' }))
  expect(screen.getByRole('button', { name: '退出复习' }).disabled).toBe(true)
  expect(screen.getByRole('button', { name: '收藏卡片' }).disabled).toBe(true)
  await act(async () => { release() })
  await screen.findByText('这一轮做完了')
})
