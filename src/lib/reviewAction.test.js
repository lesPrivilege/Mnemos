import { IDBFactory } from 'fake-indexeddb'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
let storage, actions, events, idb, bigStore
const base = { id: 'c', deckId: 'd', front: 'Q', back: 'A', repetitions: 3, interval: 12, easiness: 2.5, dueDate: '2026-01-01', lapses: 2, suspended: false, leech: false }
beforeEach(async () => {
  vi.resetModules()
  const map = new Map()
  vi.stubGlobal('localStorage', { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key) })
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('crypto', webcrypto)
  storage = await import('./storage'); bigStore = await import('./bigStore'); actions = await import('./reviewAction'); events = await import('./derive/events'); idb = await import('./idb')
  await bigStore.hydrate()
  await storage.importDataConfirmed({ decks: [{ id: 'd', name: 'D' }], cards: [base] })
})
afterEach(async () => { await bigStore.flushBigStoreWritesForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('undo restores mature Again fields and removes exactly its event', async () => {
  events.recordEvent({ module: 'recall', itemId: 'other', quality: 4 })
  const before = storage.getCardSM2('c')
  const result = await actions.commitRating(base, 1, 0, 'd')
  expect(result.card).toMatchObject({ repetitions: 0, lapses: 3 })
  expect(result.requeue).toBe(true)
  expect(actions.planRating(result.card, 4, 0)).toMatchObject({ fields: null, passes: 1, requeue: true })
  await actions.undoRating(result, 'c')
  expect(storage.getCardSM2('c')).toEqual(before)
  expect(events.readEvents().map(e => e.itemId)).toEqual(['other'])
})
it('suspends the eighth lapse without requeue and supports undo', async () => {
  const card = { ...base, lapses: 7 }
  await storage.importDataConfirmed({ decks: [{ id: 'd' }], cards: [card] })
  const result = await actions.commitRating(card, 1, 0, 'd')
  expect(result.requeue).toBe(false)
  expect(storage.getCard('c')).toMatchObject({ lapses: 8, leech: true, suspended: true })
  await actions.undoRating(result, 'c')
  expect(storage.getCard('c')).toMatchObject({ lapses: 7, leech: false, suspended: false })
})
it('preserves learning Good, failure and graduation rules', () => {
  const card = { ...base, repetitions: 0 }
  expect(actions.planRating(card, 4, 0)).toEqual({ fields: null, passes: 1, requeue: true })
  for (const quality of [1, 2]) expect(actions.planRating(card, quality, 1)).toEqual({ fields: null, passes: 0, requeue: true })
  for (const [quality, passes] of [[4, 1], [5, 0]]) expect(actions.planRating(card, quality, passes)).toMatchObject({ fields: { repetitions: 1, interval: 1 }, passes: 0, requeue: false })
})
it('does not record or mutate cached card when IDB commit fails', async () => {
  const before = storage.getCardSM2('c')
  vi.spyOn(idb, 'idbSet').mockResolvedValue(false)
  await expect(actions.commitRating(base, 4, 0, 'd')).rejects.toThrow()
  expect(storage.getCardSM2('c')).toEqual(before)
  expect(events.readEvents()).toEqual([])
})
it('compensates a failed event write without advancing the card', async () => {
  const before = storage.getCardSM2('c')
  vi.spyOn(events, 'recordEvent').mockReturnValue(null)
  await expect(actions.commitRating(base, 4, 0, 'd')).rejects.toThrow('记录保存失败')
  expect(storage.getCardSM2('c')).toEqual(before)
})
it('reports incomplete compensation after event failure instead of permitting an ordinary retry', async () => {
  vi.spyOn(events, 'recordEvent').mockReturnValue(null)
  vi.spyOn(storage, 'updateCardSM2Confirmed').mockResolvedValueOnce(base).mockRejectedValueOnce(new Error('disk'))
  await expect(actions.commitRating(base, 4, 0, 'd')).rejects.toMatchObject({ requiresReload: true })
})
it('reports the retained event when undo compensation also fails', async () => {
  const result = await actions.commitRating(base, 4, 0, 'd')
  vi.spyOn(events, 'removeEvent').mockReturnValue(false)
  vi.spyOn(storage, 'updateCardSM2Confirmed').mockResolvedValueOnce(base).mockRejectedValueOnce(new Error('disk'))
  await expect(actions.undoRating(result, 'c')).rejects.toMatchObject({ requiresReload: true })
})
