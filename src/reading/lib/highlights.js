// Reading highlights storage
import { load, save } from './storageUtils'

const KEY = 'reading-highlights'

export function getHighlightsByDoc(docId) {
  return load(KEY, []).filter(h => h.docId === docId)
}

export function getAllHighlights() {
  return load(KEY, [])
}

export function addHighlight(docId, selectedText, contextSnippet = '', textOffset = -1, length = 0, anchor = {}) {
  const highlights = load(KEY, [])
  const highlight = {
    id: crypto.randomUUID(),
    docId,
    selectedText,
    contextSnippet,
    textOffset,
    length,
    note: '',
    contextBefore: anchor.contextBefore || '',
    contextAfter: anchor.contextAfter || '',
    createdAt: new Date().toISOString(),
  }
  highlights.push(highlight)
  const result = save(KEY, highlights)
  if (!result.ok) throw new Error(result.error || '摘录未保存，请重试。')
  return highlight
}

export function updateHighlight(id, fields) {
  const highlights = load(KEY, [])
  const h = highlights.find(x => x.id === id)
  if (h) Object.assign(h, fields)
  const result = save(KEY, highlights)
  if (!result.ok) throw new Error(result.error || '笔记未保存，请重试。')
  return h
}

export function deleteHighlight(id) {
  save(KEY, load(KEY, []).filter(h => h.id !== id))
}
