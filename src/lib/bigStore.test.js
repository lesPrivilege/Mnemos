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

async function loadBigStore({ indexedDb = new IDBFactory() } = {}) {
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

  it('migrates localStorage data to IDB and retains the local copy', async () => {
    const records = [{ id: 'local' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore()
    const { idbGet } = await import('./idb')

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(records))
    expect(await idbGet('kv', KEY)).toBe(JSON.stringify(records))
  })

  it('prefers IDB over stale localStorage in steady state', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: 'stale' }]))
    const bigStore = await loadBigStore()
    const { idbSet } = await import('./idb')
    await idbSet('kv', KEY, JSON.stringify([{ id: 'idb' }]))

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual([{ id: 'idb' }])
  })

  it('quarantines corrupt IDB data and falls back to localStorage', async () => {
    const records = [{ id: 'local' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore()
    const { idbSet } = await import('./idb')
    await idbSet('kv', KEY, '{oops')

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    expect(getQuarantinedRaw(KEY)).toBe('{oops')
  })

  it('runs in localStorage-only mode when IndexedDB is unavailable', async () => {
    const records = [{ id: 'local-only' }]
    localStorage.setItem(KEY, JSON.stringify(records))
    const bigStore = await loadBigStore({ indexedDb: undefined })

    await bigStore.hydrate()

    expect(bigStore.getCached(KEY)).toEqual(records)
    expect(bigStore.setCached(KEY, [{ id: 'saved' }])).toEqual({ ok: true })
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([{ id: 'saved' }])
  })

  it('updates cache, IDB, and localStorage on setCached', async () => {
    const bigStore = await loadBigStore()
    const { idbGet } = await import('./idb')
    await bigStore.hydrate()

    expect(bigStore.setCached(KEY, [{ id: 'saved' }])).toEqual({ ok: true })
    await bigStore.flushBigStoreWritesForTests()

    expect(bigStore.getCached(KEY)).toEqual([{ id: 'saved' }])
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([{ id: 'saved' }])
    expect(await idbGet('kv', KEY)).toBe(JSON.stringify([{ id: 'saved' }]))
  })
})
