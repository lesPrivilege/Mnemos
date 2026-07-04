// Reading module backup — export all data, import (replace or merge)
import { load, save } from './storageUtils'
import { idbSet } from '../../lib/idb'
import { getDocuments, getDocumentContent } from './storage'

const ALL_KEYS = [
  'reading-collections',
  'reading-documents',
  'reading-highlights',
  'reading-bookmarks',
  'reading-stats',
  'reading-settings',
]

const BODY_STORE = 'reading-doc-bodies'

export async function exportReadingData() {
  const data = {}
  for (const key of ALL_KEYS) {
    data[key] = load(key, null)
  }
  // Include document bodies from IndexedDB
  const docs = getDocuments()
  const bodies = {}
  for (const doc of docs) {
    const body = await getDocumentContent(doc.id)
    if (body) bodies[doc.id] = body
  }
  if (Object.keys(bodies).length > 0) data.bodies = bodies
  return data
}

export async function importReadingData(data) {
  if (!data || typeof data !== 'object') return
  for (const key of ALL_KEYS) {
    if (key in data) save(key, data[key])
  }
  // Restore document bodies to IndexedDB
  if (data.bodies) {
    const docs = getDocuments()
    for (const [id, body] of Object.entries(data.bodies)) {
      await idbSet(BODY_STORE, id, body)
    }
    // Ensure restored docs have hasBody flag and no embedded content
    const updated = docs.map(d => {
      if (data.bodies[d.id] && (d.content || !d.hasBody)) {
        const { content: _content, ...rest } = d
        return { ...rest, hasBody: true }
      }
      return d
    })
    save('reading-documents', updated)
  }
}

export function clearReadingStats() {
  localStorage.removeItem('reading-stats')
  localStorage.removeItem('reading-active-session')
  localStorage.removeItem('reading-completed-docs')
}

export function clearAllReadingData() {
  for (const key of ALL_KEYS) {
    localStorage.removeItem(key)
  }
  localStorage.removeItem('reading-active-session')
  localStorage.removeItem('reading-completed-docs')
}

export async function mergeReadingData(data) {
  if (!data || typeof data !== 'object') return
  for (const key of ALL_KEYS) {
    if (!(key in data)) continue
    const incoming = data[key]
    const existing = load(key, null)

    // Collections + Documents: merge by id, skip duplicates
    if (key === 'reading-collections' || key === 'reading-documents') {
      if (!Array.isArray(incoming) || !Array.isArray(existing)) {
        save(key, incoming)
        continue
      }
      const ids = new Set(existing.map(item => item.id))
      for (const item of incoming) {
        if (!ids.has(item.id)) existing.push(item)
      }
      save(key, existing)
      continue
    }

    // Stats: keep existing if already present (don't overwrite real stats with backup)
    if (key === 'reading-stats') {
      if (!existing || !existing.totalMinutes) save(key, incoming)
      continue
    }

    // Highlights, Bookmarks, Settings: simple merge by id where applicable, else replace
    if ((key === 'reading-highlights' || key === 'reading-bookmarks') && Array.isArray(incoming) && Array.isArray(existing)) {
      const ids = new Set(existing.map(item => item.id))
      for (const item of incoming) {
        if (!ids.has(item.id)) existing.push(item)
      }
      save(key, existing)
      continue
    }

    // Settings: keep existing, import only if missing
    if (key === 'reading-settings') {
      if (!existing) save(key, incoming)
      continue
    }

    save(key, incoming)
  }
  // Restore document bodies to IndexedDB (merge: only write for docs that were just merged in)
  if (data.bodies) {
    const docs = getDocuments()
    for (const [id, body] of Object.entries(data.bodies)) {
      await idbSet(BODY_STORE, id, body)
    }
    const updated = docs.map(d => {
      if (data.bodies[d.id] && (d.content || !d.hasBody)) {
        const { content: _content, ...rest } = d
        return { ...rest, hasBody: true }
      }
      return d
    })
    save('reading-documents', updated)
  }
}
