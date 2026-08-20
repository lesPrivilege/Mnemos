// Reading module storage — isolated from flashcard (mnemos-*) and quiz (examprep-*)
// localStorage keys: reading-collections, reading-documents, reading-settings
// IndexedDB store: reading-doc-bodies (document content)
import { load, save } from './storageUtils'
import { idbGet, idbSet, idbDel } from '../../lib/idb'

const KEYS = {
  COLLECTIONS: 'reading-collections',
  DOCUMENTS: 'reading-documents',
  SETTINGS: 'reading-settings',
  DISMISSED_CONTINUE: 'reading-dismissed-continue',
}

const BODY_STORE = 'reading-doc-bodies'
let documentMutationQueue = Promise.resolve()

function enqueueDocumentMutation(operation) {
  const result = documentMutationQueue.then(operation, operation)
  documentMutationQueue = result.catch(() => {})
  return result
}

export class ReadingStorageError extends Error {
  constructor(operation, stage, cause, rollbackFailures = []) {
    super(`Reading ${operation} failed during ${stage}`, { cause })
    this.name = 'ReadingStorageError'
    this.operation = operation
    this.stage = stage
    this.rollbackFailures = rollbackFailures
  }
}

function requireSave(result, key) {
  if (!result?.ok) throw new Error(result?.error || `${key} was not saved`)
}

async function restoreDeletedDocument({ docs, highlights, bookmarks, body, id }) {
  const failures = []
  const restore = async (stage, action) => {
    try {
      const result = await action()
      if (result === false || result?.ok === false) throw new Error(`${stage} restore failed`)
    } catch (error) {
      failures.push({ stage, error })
    }
  }

  if (body !== undefined) {
    await restore('body', async () => {
      const restored = await idbSet(BODY_STORE, id, body)
      if (!restored || await idbGet(BODY_STORE, id) !== body) return false
      return true
    })
  }
  await restore('highlights', () => {
    const current = load('reading-highlights', [])
    const currentIds = new Set(current.map(item => item.id))
    const removed = highlights.filter(item => item.docId === id && !currentIds.has(item.id))
    return save('reading-highlights', [...current, ...removed])
  })
  await restore('bookmarks', () => {
    const current = load('reading-bookmarks', [])
    const currentIds = new Set(current.map(item => item.id))
    const removed = bookmarks.filter(item => item.docId === id && !currentIds.has(item.id))
    return save('reading-bookmarks', [...current, ...removed])
  })
  await restore('metadata', () => {
    const current = getDocuments()
    const deleted = docs.find(doc => doc.id === id)
    if (!deleted || current.some(doc => doc.id === id)) return { ok: true }
    return save(KEYS.DOCUMENTS, [...current, deleted])
  })
  return failures
}

// ── Collections ──────────────────────────────────────

export function getCollections() {
  return load(KEYS.COLLECTIONS, [])
}

export function getCollection(id) {
  return getCollections().find(c => c.id === id) || null
}

export function addCollection(name, icon = '📖') {
  const collections = getCollections()
  const collection = {
    id: crypto.randomUUID(),
    name,
    icon,
    pinned: false,
    createdAt: new Date().toISOString(),
  }
  collections.push(collection)
  save(KEYS.COLLECTIONS, collections)
  return collection
}

export function updateCollection(id, fields) {
  const collections = getCollections()
  const col = collections.find(c => c.id === id)
  if (col) Object.assign(col, fields)
  save(KEYS.COLLECTIONS, collections)
  return col
}

/**
 * Delete collection and its documents atomically (single read, two saves)
 */
export function deleteCollection(id) {
  const collections = getCollections()
  const docs = getDocuments()
  const docIds = new Set(docs.filter(d => d.collectionId === id).map(d => d.id))

  save(KEYS.COLLECTIONS, collections.filter(c => c.id !== id))
  save(KEYS.DOCUMENTS, docs.filter(d => d.collectionId !== id))

  // Clean up orphan highlights, bookmarks, and IDB bodies
  for (const docId of docIds) {
    idbDel(BODY_STORE, docId).catch(() => {})
  }
  if (docIds.size > 0) {
    const highlights = load('reading-highlights', [])
    const bookmarks = load('reading-bookmarks', [])
    save('reading-highlights', highlights.filter(h => !docIds.has(h.docId)))
    save('reading-bookmarks', bookmarks.filter(b => !docIds.has(b.docId)))
  }
}

// ── Documents ────────────────────────────────────────

export function getDocuments() {
  return load(KEYS.DOCUMENTS, [])
}

export function getDocument(id) {
  return getDocuments().find(d => d.id === id) || null
}

/**
 * Get document content from IndexedDB (async).
 * Falls back to embedded content for unmigrated docs.
 */
export async function getDocumentContent(id) {
  const body = await idbGet(BODY_STORE, id)
  if (body !== undefined) return body
  // Fallback: check if content is still embedded in metadata (pre-migration)
  const doc = getDocument(id)
  return doc?.content || ''
}

export function getDocumentsByCollection(collectionId) {
  return getDocuments().filter(d => d.collectionId === collectionId)
}

export function addDocument(collectionId, title, content, format = 'md') {
  return enqueueDocumentMutation(async () => {
    const id = crypto.randomUUID()
    const doc = {
      id,
      collectionId,
      title,
      format,
      hasBody: true,
      createdAt: new Date().toISOString(),
      lastReadAt: null,
      scrollPct: 0,
    }
    let bodySaved = false
    try {
      bodySaved = await idbSet(BODY_STORE, id, content)
      if (!bodySaved) throw new Error('Document body was not saved')

      const docs = getDocuments()
      docs.push(doc)
      requireSave(save(KEYS.DOCUMENTS, docs), KEYS.DOCUMENTS)
      return doc
    } catch (error) {
      const rollbackFailures = []
      if (bodySaved) {
        try {
          const deleted = await idbDel(BODY_STORE, id)
          if (!deleted || await idbGet(BODY_STORE, id) !== undefined) {
            throw new Error('Document body rollback could not be verified', { cause: error })
          }
        } catch (rollbackError) {
          rollbackFailures.push({ stage: 'body', error: rollbackError })
        }
      }
      throw new ReadingStorageError('addDocument', bodySaved ? 'metadata' : 'body', error, rollbackFailures)
    }
  })
}

export function updateDocument(id, fields) {
  const docs = getDocuments()
  const doc = docs.find(d => d.id === id)
  if (doc) Object.assign(doc, fields)
  save(KEYS.DOCUMENTS, docs)
  return doc
}

export function deleteDocument(id) {
  return enqueueDocumentMutation(async () => {
    const body = await idbGet(BODY_STORE, id)
    let stage = 'body'
    let docs = []
    let highlights = []
    let bookmarks = []

    try {
      const deleted = await idbDel(BODY_STORE, id)
      if (!deleted || await idbGet(BODY_STORE, id) !== undefined) {
        throw new Error('Document body deletion could not be verified')
      }

      // Load local records after the awaited IDB work so synchronous updates
      // made while deletion was pending are not overwritten by a stale snapshot.
      docs = getDocuments()
      highlights = load('reading-highlights', [])
      bookmarks = load('reading-bookmarks', [])

      stage = 'highlights'
      requireSave(
        save('reading-highlights', highlights.filter(h => h.docId !== id)),
        'reading-highlights',
      )

      stage = 'bookmarks'
      requireSave(
        save('reading-bookmarks', bookmarks.filter(b => b.docId !== id)),
        'reading-bookmarks',
      )

      stage = 'metadata'
      requireSave(save(KEYS.DOCUMENTS, docs.filter(d => d.id !== id)), KEYS.DOCUMENTS)
      return { ok: true }
    } catch (error) {
      const rollbackFailures = await restoreDeletedDocument({
        docs,
        highlights,
        bookmarks,
        body,
        id,
      })
      throw new ReadingStorageError('deleteDocument', stage, error, rollbackFailures)
    }
  })
}

export function toggleCollectionPin(id) {
  const collections = getCollections()
  const col = collections.find(c => c.id === id)
  if (col) col.pinned = !col.pinned
  save(KEYS.COLLECTIONS, collections)
  return col?.pinned ?? false
}

// ── Reading Progress ─────────────────────────────────

export function updateReadingProgress(id, scrollPct) {
  updateDocument(id, {
    scrollPct,
    lastReadAt: new Date().toISOString(),
  })
}

// ── Recent / Continue Reading ────────────────────────

export function getRecentDocuments(limit = 5) {
  return getDocuments()
    .filter(d => d.lastReadAt)
    .sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt))
    .slice(0, limit)
}

export function getContinueReading() {
  const candidates = getDocuments()
    .filter(d => d.lastReadAt && d.scrollPct > 0 && d.scrollPct < 100)
  if (candidates.length === 0) return null
  candidates.sort((a, b) => b.lastReadAt.localeCompare(a.lastReadAt))
  return candidates[0]
}

// ── Dismissed continue hint ──────────────────────────

// 「不再提示」按篇记——只压住当前续读篇，另读他篇后提示自然复现。
// 阅读位置本就随文档持久化（scrollPct / lastReadAt），此处只记「哪篇被拒」。

export function getDismissedContinueId() {
  return load(KEYS.DISMISSED_CONTINUE, null)
}

export function setDismissedContinueId(id) {
  save(KEYS.DISMISSED_CONTINUE, id)
}

// ── Settings ─────────────────────────────────────────

const DEFAULT_SETTINGS = {
  fontSize: 18,
  lineHeight: 1.8,
  margins: 24,
}

export function getReadingSettings() {
  return load(KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export function updateReadingSettings(fields) {
  const current = getReadingSettings()
  const updated = { ...current, ...fields }
  save(KEYS.SETTINGS, updated)
  return updated
}

// ── Migration: move embedded content to IndexedDB ─────

/**
 * One-time migration: move document content from localStorage to IndexedDB.
 * Idempotent — skips documents already migrated (no content field or hasBody flag).
 * Call once on reading-module init.
 */
export async function migrateBodiesToIDB() {
  const docs = getDocuments()
  let migrated = 0
  for (const doc of docs) {
    if (doc.content && !doc.hasBody) {
      const bodySaved = await idbSet(BODY_STORE, doc.id, doc.content)
      // Inline content is the only durable copy until the IDB transaction has
      // committed. A failed attempt remains eligible for the next migration.
      if (!bodySaved) continue
      delete doc.content
      doc.hasBody = true
      migrated++
    }
  }
  if (migrated > 0) {
    save(KEYS.DOCUMENTS, docs)
    console.log(`Reading: migrated ${migrated} document body/bodies to IndexedDB`)
  }
}
