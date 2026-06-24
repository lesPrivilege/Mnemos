// Reading module storage — isolated from flashcard (mnemos-*) and quiz (examprep-*)
// localStorage keys: reading-collections, reading-documents, reading-settings
// IndexedDB store: reading-doc-bodies (document content)
import { load, save } from './storageUtils'
import { idbGet, idbSet, idbDel } from '../../lib/idb'

const KEYS = {
  COLLECTIONS: 'reading-collections',
  DOCUMENTS: 'reading-documents',
  SETTINGS: 'reading-settings',
}

const BODY_STORE = 'reading-doc-bodies'

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
  const docs = getDocuments()
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
  docs.push(doc)
  save(KEYS.DOCUMENTS, docs)
  // Body to IDB (async, non-blocking)
  idbSet(BODY_STORE, id, content).catch(() => {})
  return doc
}

export function updateDocument(id, fields) {
  const docs = getDocuments()
  const doc = docs.find(d => d.id === id)
  if (doc) Object.assign(doc, fields)
  save(KEYS.DOCUMENTS, docs)
  return doc
}

export function deleteDocument(id) {
  save(KEYS.DOCUMENTS, getDocuments().filter(d => d.id !== id))
  idbDel(BODY_STORE, id).catch(() => {})
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
  return getDocuments()
    .find(d => d.lastReadAt && d.scrollPct > 0 && d.scrollPct < 100) || null
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
      await idbSet(BODY_STORE, doc.id, doc.content)
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
