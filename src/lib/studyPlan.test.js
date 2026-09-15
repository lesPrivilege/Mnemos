import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { addToPlan, loadPlan, movePlanItem, normalizePlan, planKey, restorePlan, savePlan } from './studyPlan'
let map
beforeEach(() => { map = new Map(); vi.stubGlobal('localStorage', { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('persists ordered typed references while the cursor follows identity through moves', () => {
  const refs = [{ kind: 'deck', id: 'same' }, { kind: 'document', id: 'same' }]
  let plan = addToPlan(loadPlan(), refs)
  plan = savePlan({ ...plan, cursor: planKey(refs[1]) })
  movePlanItem(plan, planKey(refs[1]), 0)
  expect(loadPlan().items).toEqual([refs[1], refs[0]])
  expect(loadPlan().cursor).toBe(planKey(refs[1]))
  expect(normalizePlan({ items: [...refs, refs[0]] }).items).toHaveLength(2)
})
it('retains prior plan when a write fails', () => {
  const before = savePlan({ items: [{ kind: 'deck', id: 'd' }] })
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('disk') })
  expect(() => addToPlan(before, [{ kind: 'subject', id: 's' }])).toThrow('disk')
  expect(loadPlan()).toEqual(before)
})
it('remaps merged IDs, preserves subject identity, and keeps missing links visibly unresolved', () => {
  const incoming = { items: [{ kind: 'deck', id: 'd' }, { kind: 'document', id: 'r' }, { kind: 'subject', id: '线性/代数' }, { kind: 'collection', id: 'missing' }] }
  restorePlan(incoming, { merge: true, maps: { deckIds: { d: 'd2' }, documentIds: { r: 'r2' } } })
  expect(loadPlan().items).toEqual([{ kind: 'deck', id: 'd2' }, { kind: 'document', id: 'r2' }, incoming.items[2], { ...incoming.items[3], unresolved: true }])
})
it('exports the plan and follows actual deck collision IDs during confirmed merge', async () => {
  const { IDBFactory } = await import('fake-indexeddb')
  vi.stubGlobal('indexedDB', new IDBFactory())
  const bigStore = await import('./bigStore')
  const storage = await import('./storage')
  const { buildFullBackup } = await import('./fullBackup')
  await bigStore.hydrate()
  await storage.importDataConfirmed({ decks: [{ id: 'd', name: '原卡组' }], cards: [{ id: 'c', deckId: 'd', front: 'Q', back: 'A', dueDate: '2026-01-01' }] })
  savePlan({ items: [{ kind: 'deck', id: 'd' }] })
  const backup = await buildFullBackup()
  expect(backup.plan.items).toEqual([{ kind: 'deck', id: 'd' }])
  const maps = await storage.mergeDataConfirmed(backup.flashcard)
  expect(maps.deckIds.d).not.toBe('d')
  restorePlan(backup.plan, { merge: true, maps })
  expect(loadPlan().items[1]).toEqual({ kind: 'deck', id: maps.deckIds.d })
  expect(storage.getDeck(maps.deckIds.d).name).toBe('原卡组')
  expect(storage.getCard('c').dueDate).toBe('2026-01-01')
  const repeated = await storage.mergeDataConfirmed(backup.flashcard)
  expect(repeated).toEqual(maps)
  expect(storage.getDecks()).toHaveLength(2)
})
it('repairs an unresolved import only with an explicit map, preserving its cursor without a duplicate', () => {
  const incoming = { items: [{ kind: 'deck', id: 'd' }] }
  restorePlan(incoming, { merge: true })
  expect(loadPlan().items[0].unresolved).toBe(true)
  restorePlan(incoming, { merge: true, maps: { deckIds: { d: 'mapped-d' } } })
  expect(loadPlan().items).toEqual([{ kind: 'deck', id: 'mapped-d' }])
  expect(loadPlan().cursor).toBe(planKey({ kind: 'deck', id: 'mapped-d' }))
})
