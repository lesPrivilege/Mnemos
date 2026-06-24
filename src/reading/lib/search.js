// Lightweight document search — title + content substring matching
// No external dependencies, client-side only

import { getDocuments, getDocumentContent } from './storage'

/**
 * Search documents by query string
 * @param {string} query - search term
 * @param {number} limit - max results
 * @returns {Promise<{doc: object, snippet: string}[]>}
 */
export async function searchDocuments(query, limit = 20) {
  if (!query || !query.trim()) return []
  const q = query.trim().toLowerCase()
  const docs = getDocuments()
  const results = []

  for (const doc of docs) {
    const titleMatch = (doc.title || '').toLowerCase().includes(q)
    let contentMatch = false
    let snippet = ''

    if (titleMatch) {
      // Title match — no need to load content
    } else {
      // Need to check content (from IDB)
      const content = await getDocumentContent(doc.id)
      contentMatch = (content || '').toLowerCase().includes(q)
      if (!contentMatch) continue
      snippet = extractSnippet(content, q, 80)
    }

    results.push({
      doc,
      snippet,
      titleMatch,
    })
  }

  // Sort: title matches first, then content matches
  results.sort((a, b) => {
    if (a.titleMatch && !b.titleMatch) return -1
    if (!a.titleMatch && b.titleMatch) return 1
    return 0
  })

  return results.slice(0, limit)
}

/**
 * Extract a snippet around the first match
 * @param {string} content - full document content
 * @param {string} query - lowercase query
 * @param {number} context - characters of context around match
 * @returns {string}
 */
function extractSnippet(content, query, context = 80) {
  const lower = content.toLowerCase()
  const idx = lower.indexOf(query)
  if (idx === -1) return content.slice(0, context * 2) + '...'

  const start = Math.max(0, idx - context)
  const end = Math.min(content.length, idx + query.length + context)
  let snippet = content.slice(start, end)

  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}
