// Coordinates use the rendered container's textContent (UTF-16), never raw Markdown.
export async function fingerprintText(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function captureTextSelection(container, selection = window.getSelection()) {
  if (!container || !selection?.rangeCount || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null
  const raw = range.toString()
  const quote = raw.trim()
  if (!quote) return null
  const prefix = document.createRange()
  prefix.selectNodeContents(container)
  prefix.setEnd(range.startContainer, range.startOffset)
  const textOffset = prefix.toString().length + raw.length - raw.trimStart().length
  const text = container.textContent
  if (text.slice(textOffset, textOffset + quote.length) !== quote) return null
  const rect = range.getBoundingClientRect()
  return {
    selectedText: quote, textOffset, length: quote.length,
    contextBefore: text.slice(Math.max(0, textOffset - 60), textOffset),
    contextAfter: text.slice(textOffset + quote.length, textOffset + quote.length + 60),
    renderedText: text,
    rect: { left: rect.left, top: rect.top, bottom: rect.bottom, right: rect.right },
  }
}

export function rangeAtOffset(container, offset, length) {
  if (!Number.isInteger(offset) || offset < 0 || length <= 0) return null
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let count = 0, started = false
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const end = count + node.textContent.length
    if (!started && end > offset) { range.setStart(node, offset - count); started = true }
    if (started && end >= offset + length) { range.setEnd(node, offset + length - count); return range }
    count = end
  }
  return null
}

export function quoteCandidates(text, source) {
  const quote = source.quote || source.selectedText
  if (!quote) return []
  const candidates = []
  let start = 0
  while (start <= text.length - quote.length) {
    const offset = text.indexOf(quote, start)
    if (offset < 0) break
    const before = text.slice(Math.max(0, offset - 60), offset)
    const after = text.slice(offset + quote.length, offset + quote.length + 60)
    candidates.push({ offset, length: quote.length, context: `${before}【${quote}】${after}`,
      contextMatches: Boolean(source.contextBefore || source.contextAfter) &&
        (!source.contextBefore || before.endsWith(source.contextBefore)) &&
        (!source.contextAfter || after.startsWith(source.contextAfter)) })
    start = offset + Math.max(1, quote.length)
  }
  return candidates
}

export async function locateSource(container, source) {
  const text = container.textContent
  const candidates = quoteCandidates(text, source)
  const exact = source.contentFingerprint && await fingerprintText(text) === source.contentFingerprint &&
    text.slice(source.textOffset, source.textOffset + source.length) === source.quote
  if (exact) return { status: 'exact', offset: source.textOffset, length: source.length, candidates: [] }
  return { status: candidates.length ? 'changed' : 'missing', candidates }
}

export function focusSourceRange(container, offset, length) {
  const range = rangeAtOffset(container, offset, length)
  if (!range) return false
  const node = range.startContainer.parentElement
  node.tabIndex = -1
  node.focus({ preventScroll: true })
  node.scrollIntoView({ block: 'center' })
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
  return true
}
