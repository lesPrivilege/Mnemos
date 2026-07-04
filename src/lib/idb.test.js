import { IDBFactory } from 'fake-indexeddb'
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

describe('idb.js IndexedDB helper', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('indexedDB', new IDBFactory())
  })

  afterEach(() => {
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
})
