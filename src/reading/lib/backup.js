// Reading module backup — export all data, import (replace or merge)
import { READING_SCHEMA_VERSION, READING_SCHEMA_VERSION_KEY, load, save } from './storageUtils'
import { idbSet } from '../../lib/idb'
import { removeKey } from '../../lib/store'
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
  const data = { version: READING_SCHEMA_VERSION }
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
    if (key in data) { const result = save(key, data[key]); if (!result.ok) throw new Error(result.error || '阅读资料恢复失败。') }
  }
  // Restore document bodies to IndexedDB
  if (data.bodies) {
    const docs = getDocuments()
    for (const [id, body] of Object.entries(data.bodies)) {
      if (!await idbSet(BODY_STORE, id, body)) throw new Error('原文恢复失败，部分资料已恢复，请重试。')
    }
    // Ensure restored docs have hasBody flag and no embedded content
    const updated = docs.map(d => {
      if (data.bodies[d.id] && (d.content || !d.hasBody)) {
        const { content: _content, ...rest } = d
        return { ...rest, hasBody: true }
      }
      return d
    })
    const result = save('reading-documents', updated)
    if (!result.ok) throw new Error(result.error || '阅读资料恢复失败。')
  }
}

export function clearReadingStats() {
  removeKey('reading-stats')
  removeKey('reading-active-session')
  removeKey('reading-completed-docs')
}

export function clearAllReadingData() {
  for (const key of ALL_KEYS) {
    removeKey(key)
  }
  removeKey(READING_SCHEMA_VERSION_KEY)
  removeKey('reading-active-session')
  removeKey('reading-completed-docs')
}

export async function mergeReadingData(data) {
  if (!data || typeof data !== 'object') return { documentIds: {}, highlightIds: {} }
  const maps = { collectionIds: {}, documentIds: {}, highlightIds: {} }
  const merged = {}
  const newDocuments = new Set()
  async function sameObject(key, previous, incoming) {
    const fields = key === 'reading-collections' ? ['name', 'icon'] : key === 'reading-documents' ? ['title', 'format', 'collectionId'] : key === 'reading-highlights' ? ['docId', 'selectedText', 'textOffset', 'length', 'note', 'contextSnippet', 'contextBefore', 'contextAfter'] : ['docId', 'title', 'scrollPct']
    if (fields.some(field => previous[field] !== incoming[field])) return false
    if (key !== 'reading-documents') return true
    const incomingBody = data.bodies?.[incoming.id] ?? incoming.content
    return typeof incomingBody === 'string' && await getDocumentContent(previous.id) === incomingBody
  }
  for (const [key, mapName] of [['reading-collections', 'collectionIds'], ['reading-documents', 'documentIds'], ['reading-highlights', 'highlightIds'], ['reading-bookmarks', null]]) {
    const existing = load(key, []) || []
    const ids = new Set(existing.map(item => item.id))
    const incoming = Array.isArray(data[key]) ? data[key] : []
    merged[key] = [...existing]
    for (const item of incoming) {
      const translated = { ...item,
        ...(item.collectionId ? { collectionId: maps.collectionIds[item.collectionId] || item.collectionId } : {}),
        ...(item.docId ? { docId: maps.documentIds[item.docId] || item.docId } : {}) }
      let equivalent = null
      for (const previous of merged[key]) {
        if ((previous.id === item.id || previous.importedFromId === item.id) && await sameObject(key, previous, translated)) { equivalent = previous; break }
      }
      if (equivalent) { if (mapName) maps[mapName][item.id] = equivalent.id; continue }
      let id = item.id || crypto.randomUUID()
      while (ids.has(id)) id = crypto.randomUUID()
      ids.add(id)
      if (mapName) maps[mapName][item.id] = id
      if (key === 'reading-documents') newDocuments.add(id)
      merged[key].push({ ...translated, id, ...(id !== item.id ? { importedFromId: item.id } : {}) })
    }
  }
  // Bodies precede metadata. A failed body cannot become a successful linked doc.
  for (const [oldId, newId] of Object.entries(maps.documentIds)) {
    if (!newDocuments.has(newId)) continue
    const body = data.bodies?.[oldId]
    if (body != null && !await idbSet(BODY_STORE, newId, body)) throw new Error('原文恢复失败，请重试。已写入部分资料可能保留。')
  }
  for (const [key, value] of Object.entries(merged)) {
    const result = save(key, value)
    if (!result.ok) throw new Error(result.error || '阅读资料合并失败。')
  }
  for (const key of ['reading-stats', 'reading-settings']) {
    if (!load(key, null) && data[key]) {
      const result = save(key, data[key])
      if (!result.ok) throw new Error(result.error || '阅读设置恢复失败。')
    }
  }
  return maps
}
