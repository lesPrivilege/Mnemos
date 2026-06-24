// Generic Promise-based IndexedDB key-value helper
// One DB, store name passed in. Each module owns its own store names.
//
// To add a new store: bump DB_VERSION and add a createObjectStore call
// in onupgradeneeded. idbGet/idbSet will throw on a missing store otherwise.

const DB_NAME = 'mnemos'
const DB_VERSION = 1

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('reading-doc-bodies')) {
        db.createObjectStore('reading-doc-bodies')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return dbPromise
}

export async function idbGet(store, key) {
  const db = await openDB()
  if (!db) return undefined
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(undefined)
  })
}

export async function idbSet(store, key, val) {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(val, key)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
  })
}

export async function idbDel(store, key) {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
  })
}

export async function idbKeys(store) {
  const db = await openDB()
  if (!db) return []
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve([])
  })
}
