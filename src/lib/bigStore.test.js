import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuarantinedRaw } from './quarantine'

const KEY = 'big-record'

function createLocalStorage() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

async function loadBigStore(options = {}) {
  // Destructuring defaults substitute for an explicit `undefined` too, which
  // would silently defeat callers simulating "IndexedDB unavailable" via
  // `{ indexedDb: undefined }`. Check for the key's presence instead.
  const indexedDb = 'indexedDb' in options ? options.indexedDb : new IDBFactory()
  vi.resetModules()
  vi.stubGlobal('indexedDB', indexedDb)
  const bigStore = await import('./bigStore')
  bigStore.registerBigRecord({
    key: KEY,
    fallback: [],
    validate: Array.isArray,
    label: '大数据未保存',
  })
  return bigStore
}

describe('bigStore hydrate-cache primitive', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hydrates a fresh install to the fallback without writing IDB', async () => {
    const bigStore = await loadBigStore()
    const { idbGet } = await import('./idb')

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual([])
    expect(await idbGet('kv', KEY)).toBeUndefined()
  })

  it('migrates localStorage data to IDB and deletes the stale local copy', async () => {
    const records = [{ id: 'local' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore()
    const { idbGet } = await import('./idb')

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    expect(await idbGet('kv', KEY)).toBe(JSON.stringify(records))
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('prefers IDB over stale localStorage in steady state', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 'stale' }]))
    const bigStore = await loadBigStore()
    const { idbSet } = await import('./idb')
    await idbSet('kv', KEY, JSON.stringify([{ id: 'idb' }]))

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual([{ id: 'idb' }])
  })

  it('quarantines corrupt IDB data, falls back to localStorage, and deletes the stale copy once IDB is repaired', async () => {
    const records = [{ id: 'local' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore()
    const { idbSet } = await import('./idb')
    await idbSet('kv', KEY, '{oops')

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    expect(getQuarantinedRaw(KEY)).toBe('{oops')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('runs in localStorage-only mode when IndexedDB is unavailable', async () => {
    const records = [{ id: 'local-only' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore({ indexedDb: undefined })

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    // No working IDB to confirm a write against, so the stale localStorage
    // copy is never deleted here — it remains the only durable copy.
    expect(bigStore.setCached(KEY, [{ id: 'saved' }])).toEqual({ ok: true })
    await bigStore.flushBigStoreWritesForTests()
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(records))
  })

  it('updates cache and IDB, then deletes the stale localStorage copy on setCached', async () => {
    const bigStore = await loadBigStore()
    const { idbGet } = await import('./idb')
    await bigStore.hydrate()

    expect(bigStore.setCached(KEY, [{ id: 'saved' }])).toEqual({ ok: true })
    await bigStore.flushBigStoreWritesForTests()

    expect(bigStore.getCached(KEY)).toEqual([{ id: 'saved' }])
    expect(await idbGet('kv', KEY)).toBe(JSON.stringify([{ id: 'saved' }]))
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('does not write big records to localStorage on setCached', async () => {
    const bigStore = await loadBigStore()
    await bigStore.hydrate()

    localStorage.setItem.mockClear()
    bigStore.setCached(KEY, [{ id: 'saved' }])
    await bigStore.flushBigStoreWritesForTests()

    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('keeps the localStorage copy when a mid-session IDB write fails', async () => {
    const records = [{ id: 'local' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore()
    await bigStore.hydrate()
    // hydrate's own migration write succeeds here, so the pre-existing
    // localStorage copy is already gone before we simulate the failure below.
    expect(localStorage.getItem(KEY)).toBeNull()

    // Put the "stale" copy back to represent a save that's about to fail.
    localStorage.setItem(KEY, JSON.stringify(records))

    const idb = await import('./idb')
    const idbSetSpy = vi.spyOn(idb, 'idbSet').mockResolvedValueOnce(false)

    expect(bigStore.setCached(KEY, [{ id: 'saved' }])).toEqual({ ok: true })
    await bigStore.flushBigStoreWritesForTests()

    expect(idbSetSpy).toHaveBeenCalled()
    // Write reported failure, so the stale localStorage copy must be left
    // in place rather than deleted out from under the only durable copy.
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(records))

    idbSetSpy.mockRestore()
  })
})
