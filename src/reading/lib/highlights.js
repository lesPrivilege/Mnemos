// Reading highlights storage
import { load, save } from './storageUtils'

const KEY = 'reading-highlights'

export function getHighlightsByDoc(docId) {
  return load(KEY, []).filter(h => h.docId === docId)
}

export function getAllHighlights() {
  return load(KEY, [])
}

export function addHighlight(docId, selectedText, contextSnippet = '', textOffset = -1, length = 0) {
  const highlights = load(KEY, [])
  const highlight = {
    id: crypto.randomUUID(),
    docId,
    selectedText,
    contextSnippet,
    textOffset,
    length,
    note: '',
    createdAt: new Date().toISOString(),
  }
  highlights.push(highlight)
  save(KEY, highlights)
  return highlight
}

export function updateHighlight(id, fields) {
  const highlights = load(KEY, [])
  const h = highlights.find(x => x.id === id)
  if (h) Object.assign(h, fields)
  save(KEY, highlights)
  return h
}

export function deleteHighlight(id) {
  save(KEY, load(KEY, []).filter(h => h.id !== id))
}
