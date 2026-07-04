import { IDBFactory } from 'fake-indexeddb'
import FDBObjectStore from 'fake-indexeddb/lib/FDBObjectStore'
import FDBRequest from 'fake-indexeddb/lib/FDBRequest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function createV1ReadingDb() {
  const req = indexedDB.open('mnemos', 1)
  req.onupgradeneeded = () => {
    req.result.createObjectStore('reading-doc-bodies')
  }
  const db = await requestToPromise(req)
  const tx = db.transaction('reading-doc-bodies', 'readwrite')
  tx.objectStore('reading-doc-bodies').put('legacy body', 'doc-1')
  await txDone(tx)
  db.close()
}

// Forces the next FDBObjectStore.put() to fail with a request-level error,
// the same way a real IndexedDB write can fail (quota, constraint, etc.) —
// so idbSet() can be exercised down its genuine onerror path rather than a
// synchronous throw.
function forcePutErrorOnce() {
  const spy = vi.spyOn(FDBObjectStore.prototype, 'put').mockImplementationOnce(function mockPut() {
    const request = new FDBRequest()
    request.source = this
    request.transaction = this.transaction
    request.error = new DOMException('forced failure', 'UnknownError')
    queueMicrotask(() => {
      request.readyState = 'done'
      if (typeof request.onerror === 'function') request.onerror(new Event('error'))
    })
    return request
  })
  return spy
}

describe('idb.js IndexedDB helper', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('upgrades v1 reading data and adds the kv store', async () => {
    await createV1ReadingDb()

    const { idbGet, idbSet } = await import('./idb')

    expect(await idbGet('reading-doc-bodies', 'doc-1')).toBe('legacy body')

    await idbSet('kv', 'examprep-questions', '[]')

    expect(await idbGet('kv', 'examprep-questions')).toBe('[]')
    expect(await idbGet('reading-doc-bodies', 'doc-1')).toBe('legacy body')
  })

  it('idbSet resolves true on a successful write', async () => {
    const { idbSet } = await import('./idb')

    expect(await idbSet('kv', 'some-key', 'some-value')).toBe(true)
  })

  it('idbSet resolves false when the underlying write request errors', async () => {
    const { idbSet } = await import('./idb')
    const spy = forcePutErrorOnce()

    expect(await idbSet('kv', 'some-key', 'some-value')).toBe(false)
    expect(spy).toHaveBeenCalled()
  })

  it('idbSet resolves false when IndexedDB is unavailable', async () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('indexedDB', undefined)
    vi.resetModules()
    const { idbSet } = await import('./idb')

    expect(await idbSet('kv', 'some-key', 'some-value')).toBe(false)
  })
})
