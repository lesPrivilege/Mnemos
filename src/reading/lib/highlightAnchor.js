// Highlight anchoring — resolve highlights to DOM ranges and repaint them
// Uses textOffset/length (primary) or selectedText occurrence (fallback)

const MARK_SELECTOR = 'mark[data-hl-id]'
const MARK_CSS = 'background:var(--accent-soft);border-radius:2px;padding:0 1px'

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
    // Multi-element fallback: wrap each intersecting text node
    const tree = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT
    )
    let node = tree.currentNode
    while (node) {
      if (range.intersectsNode(node)) {
        const r = document.createRange()
        if (node === range.startContainer) r.setStart(node, range.startOffset)
        else r.setStartBefore(node)
        if (node === range.endContainer) r.setEnd(node, range.endOffset)
        else r.setEndAfter(node)
        const mark = document.createElement('mark')
        mark.setAttribute('data-hl-id', hlId)
        mark.style.cssText = MARK_CSS
        try { r.surroundContents(mark) } catch {}
      }
      node = tree.nextNode()
    }
  }
}

/**
 * Resolve a DOM Range from a textOffset + length by walking text nodes.
 * Returns null if the offset is out of bounds.
 */
function resolveFromOffset(container, textOffset, length) {
  const tree = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let charCount = 0
  let startNode = null, startOffset = 0
  let endNode = null, endOffset = 0

  let node = tree.nextNode()
  while (node) {
    const nodeLen = node.textContent.length
    if (!startNode && charCount + nodeLen > textOffset) {
      startNode = node
      startOffset = textOffset - charCount
    }
    if (startNode && charCount + nodeLen >= textOffset + length) {
      endNode = node
      endOffset = textOffset + length - charCount
      break
    }
    charCount += nodeLen
    node = tree.nextNode()
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
}

/**
 * Resolve a DOM Range by searching for selectedText (nth-occurrence fallback).
 * Returns null if not found.
 */
function resolveFromText(container, selectedText) {
  const fullText = container.textContent
  const lower = fullText.toLowerCase()
  const target = selectedText.toLowerCase()
  const idx = lower.indexOf(target)
  if (idx === -1) return null

  const tree = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let charCount = 0
  let startNode = null, startOffset = 0
  let endNode = null, endOffset = 0

  let node = tree.nextNode()
  while (node) {
    const nodeLen = node.textContent.length
    if (!startNode && charCount + nodeLen > idx) {
      startNode = node
      startOffset = idx - charCount
    }
    if (startNode && charCount + nodeLen >= idx + selectedText.length) {
      endNode = node
      endOffset = idx + selectedText.length - charCount
      break
    }
    charCount += nodeLen
    node = tree.nextNode()
  }

  if (!startNode || !endNode) return null

  const range = document.createRange()
  range.setStart(startNode, startOffset)
  range.setEnd(endNode, endOffset)
  return range
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
      range = resolveFromOffset(container, hl.textOffset, hl.length)
    }

    // Fallback: text-occurrence resolution
    if (!range && hl.selectedText) {
      range = resolveFromText(container, hl.selectedText)
    }

    if (range) {
      wrapRange(range, hl.id)
    }
  }
}
