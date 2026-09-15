import { rangeAtOffset, quoteCandidates } from './sourceAnchor'
// Highlight anchoring — resolve highlights to DOM ranges and repaint them
// Uses textOffset/length (primary) or selectedText occurrence (fallback)

const MARK_SELECTOR = 'mark[data-hl-id]'
const MARK_CSS = 'background:var(--accent-soft);border-radius:var(--r-sm);padding:0 1px'

/**
 * Remove all existing highlight marks from the container (unwrap, keep text).
 */
export function removeExistingMarks(container) {
  const marks = container.querySelectorAll(MARK_SELECTOR)
  for (const mark of marks) {
    const parent = mark.parentNode
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  }
}

/**
 * Wrap a DOM Range in a <mark> with the given highlight id.
 * Uses per-text-node fallback for multi-element ranges.
 */
function wrapRange(range, hlId) {
  try {
    const mark = document.createElement('mark')
    mark.setAttribute('data-hl-id', hlId)
    mark.style.cssText = MARK_CSS
    range.surroundContents(mark)
  } catch {
    // Snapshot intersecting text nodes before mutating the DOM; never wrap the
    // common ancestor itself (it can include text outside the selection).
    const tree = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
    const nodes = []
    for (let node = tree.nextNode(); node; node = tree.nextNode()) {
      if (range.intersectsNode(node)) nodes.push(node)
    }
    const parts = nodes.map(node => ({ node,
      start: node === range.startContainer ? range.startOffset : 0,
      end: node === range.endContainer ? range.endOffset : node.textContent.length }))
    for (const { node, start, end } of parts.reverse()) {
      if (end <= start) continue
      const part = document.createRange()
      part.setStart(node, start); part.setEnd(node, end)
      const mark = document.createElement('mark')
      mark.setAttribute('data-hl-id', hlId)
      mark.style.cssText = MARK_CSS
      part.surroundContents(mark)
    }
  }
}

/**
 * Repaint all highlights into the container.
 * Primary: resolve from textOffset/length. Fallback: find selectedText.
 * @param {HTMLElement} container - the rendered document container
 * @param {Array} highlights - highlight objects from storage
 */
export function repaintHighlights(container, highlights) {
  if (!container || !highlights.length) return

  // Remove any existing marks first (idempotent)
  removeExistingMarks(container)

  // Sort by offset desc so painting doesn't shift later offsets
  const sorted = [...highlights].sort((a, b) => (b.textOffset ?? -1) - (a.textOffset ?? -1))

  for (const hl of sorted) {
    let range = null

    // Primary: offset-based resolution
    if (hl.textOffset >= 0 && hl.length > 0) {
      if (container.textContent.slice(hl.textOffset, hl.textOffset + hl.length) === hl.selectedText) {
        range = rangeAtOffset(container, hl.textOffset, hl.length)
      }
    }

    // Fallback: text-occurrence resolution
    if (!range && hl.selectedText) {
      const candidates = quoteCandidates(container.textContent, hl)
      const contextual = candidates.filter(candidate => candidate.contextMatches)
      const match = contextual.length === 1 ? contextual[0] : candidates.length === 1 ? candidates[0] : null
      if (match) range = rangeAtOffset(container, match.offset, match.length)
    }

    if (range) {
      wrapRange(range, hl.id)
    }
  }
}
