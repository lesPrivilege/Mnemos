import { IDBFactory } from 'fake-indexeddb'
import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
let storage, bigStore, idb
const source = { version: 1, kind: 'document', id: 'doc-1', quote: '摘录', textOffset: 8, length: 2, contentFingerprint: 'a'.repeat(64) }
beforeEach(async () => {
  vi.resetModules()
  const data = new Map()
  vi.stubGlobal('localStorage', { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) })
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('crypto', webcrypto)
  storage = await import('./storage'); bigStore = await import('./bigStore'); idb = await import('./idb')
  await bigStore.hydrate()
})
afterEach(async () => { await bigStore.flushBigStoreWritesForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('writes card, deck and source together; retry is idempotent and survives hydration and backup', async () => {
  const draft = { id: crypto.randomUUID(), front: '问题', back: '回答', deckName: '新卡组', source }
  const card = await storage.addSourcedCardConfirmed(draft)
  expect(card.id).toBe(draft.id)
  expect((await storage.addSourcedCardConfirmed(draft)).id).toBe(card.id)
  expect(storage.loadData().cards).toHaveLength(1)
  const exported = JSON.parse(storage.exportData())
  expect(exported.cards[0].source).toEqual(source)
  const stored = JSON.parse(await idb.idbGet('kv', 'mnemos-data'))
  expect(stored.cards[0]).toEqual(card)
  vi.resetModules()
  const reloaded = await import('./storage'); const reloadedBig = await import('./bigStore')
  await reloadedBig.hydrate()
  expect(reloaded.getCard(card.id).source).toEqual(source)
  expect(reloaded.importData(exported).ok).toBe(true)
  await reloadedBig.flushBigStoreWritesForTests()
  expect(reloaded.getCard(card.id).source).toEqual(source)
})
it('keeps cache unchanged on transaction failure and rejects competing writes while pending', async () => {
  let finish
  vi.spyOn(idb, 'idbSet').mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = storage.addSourcedCardConfirmed({ id: 'new', front: 'Q', back: 'A', deckName: 'D', source })
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  expect(() => storage.saveData({ decks: [], cards: [] })).toThrow('正在保存')
  finish(false)
  await expect(pending).rejects.toThrow('保存失败')
  expect(storage.loadData()).toMatchObject({ decks: [], cards: [] })
})
it('waits for an older queued write before committing the sourced card', async () => {
  storage.saveData({ decks: [{ id: 'd', name: '已有' }], cards: [] })
  const card = await storage.addSourcedCardConfirmed({ id: 'new', front: 'Q', back: 'A', deckId: 'd', source })
  await bigStore.flushBigStoreWritesForTests()
  expect(JSON.parse(await idb.idbGet('kv', 'mnemos-data')).cards[0].id).toBe(card.id)
})
it('keeps old backups usable and marks missing merge provenance unresolved', () => {
  expect(storage.importData({ decks: [{ id: 'd' }], cards: [{ id: 'old', deckId: 'd', front: 'Q', back: 'A' }] }).ok).toBe(true)
  expect(storage.getCard('old').source).toBeUndefined()
  storage.mergeData({ decks: [{ id: 'd' }], cards: [{ id: 'new', deckId: 'd', source }] })
  expect(storage.getCard('new').source.unresolved).toBe(true)
})
it('merges colliding reading IDs without overwriting local bodies or misbinding card sources', async () => {
  const { mergeReadingData, exportReadingData, importReadingData } = await import('../reading/lib/backup')
  localStorage.setItem('reading-documents', JSON.stringify([{ id: 'doc-1', title: '本地原文', hasBody: true }]))
  localStorage.setItem('reading-highlights', JSON.stringify([{ id: 'hl-1', docId: 'doc-1', selectedText: '本地' }]))
  await idb.idbSet('reading-doc-bodies', 'doc-1', '本地原文')
  const incoming = { 'reading-documents': [{ id: 'doc-1', title: '备份原文', hasBody: true }], 'reading-highlights': [{ id: 'hl-1', docId: 'doc-1', selectedText: '摘录' }], bodies: { 'doc-1': '备份原文' } }
  const maps = await mergeReadingData(incoming)
  storage.mergeData({ decks: [{ id: 'd' }], cards: [{ id: 'c', deckId: 'd', source: { ...source, highlightId: 'hl-1' } }] }, maps)
  expect(maps.documentIds['doc-1']).not.toBe('doc-1')
  expect(await idb.idbGet('reading-doc-bodies', 'doc-1')).toBe('本地原文')
  expect(await idb.idbGet('reading-doc-bodies', maps.documentIds['doc-1'])).toBe('备份原文')
  expect(storage.getCard('c').source).toMatchObject({ id: maps.documentIds['doc-1'], highlightId: maps.highlightIds['hl-1'] })
  const repeated = await mergeReadingData(incoming)
  expect(repeated).toEqual(maps)
  expect(JSON.parse(localStorage.getItem('reading-documents'))).toHaveLength(2)
  expect(JSON.parse(localStorage.getItem('reading-highlights'))).toHaveLength(2)
  const exported = await exportReadingData()
  await importReadingData(exported)
  expect(exported.bodies[maps.documentIds['doc-1']]).toBe('备份原文')
})
it('does not report a successful reading restore when a body transaction fails', async () => {
  const { mergeReadingData } = await import('../reading/lib/backup')
  vi.spyOn(idb, 'idbSet').mockResolvedValue(false)
  await expect(mergeReadingData({ 'reading-documents': [{ id: 'd' }], bodies: { d: '原文' } })).rejects.toThrow('原文恢复失败')
  expect(localStorage.getItem('reading-documents')).toBeNull()
})

it('marks an unmapped highlight unresolved even when its document exists', async () => {
  await storage.mergeDataConfirmed({ decks: [{ id: 'd' }], cards: [{ id: 'c', deckId: 'd', source: { ...source, highlightId: 'missing' } }] }, { documentIds: { 'doc-1': 'doc-2' }, highlightIds: {} })
  expect(storage.getCard('c').source.unresolved).toBe(true)
})
it('rejects a failed confirmed restore without changing the cached library', async () => {
  vi.spyOn(idb, 'idbSet').mockResolvedValue(false)
  await expect(storage.importDataConfirmed({ decks: [{ id: 'd' }], cards: [] })).rejects.toThrow('保存失败')
  expect(storage.loadData().decks).toEqual([])
})
