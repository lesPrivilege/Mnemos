// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
import { captureTextSelection, fingerprintText, locateSource, quoteCandidates } from './sourceAnchor'
import { repaintHighlights } from './highlightAnchor'
afterEach(() => { vi.unstubAllGlobals(); window.getSelection().removeAllRanges(); document.body.innerHTML = '' })
it('captures the second repeated phrase before DOM selection disappears', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const container = document.createElement('article')
  container.innerHTML = '<p>第一次：同一句。</p><p>第二次：同一句。</p>'
  document.body.append(container)
  const range = document.createRange()
  const text = container.lastChild.firstChild
  range.setStart(text, 4); range.setEnd(text, 8)
  range.getBoundingClientRect = () => ({ left: 0, top: 0, right: 20, bottom: 20 })
  const captured = captureTextSelection(container, { rangeCount: 1, isCollapsed: false, getRangeAt: () => range })
  expect(captured.textOffset).toBe(12)
  expect(captured.contextBefore).toContain('第二次')
  const source = { ...captured, quote: captured.selectedText, contentFingerprint: await fingerprintText(container.textContent) }
  expect((await locateSource(container, source)).status).toBe('exact')
  container.prepend(document.createTextNode('新增内容'))
  const changed = await locateSource(container, source)
  expect(changed.status).toBe('changed')
  expect(changed.candidates).toHaveLength(2)
})
it('does not paint a stale offset or silently pick the first duplicate', () => {
  const article = document.createElement('article')
  article.textContent = '变化后的句子。重复。重复。'
  repaintHighlights(article, [{ id: 'h', textOffset: 0, length: 3, selectedText: '重复。' }])
  expect(article.querySelector('mark')).toBeNull()
  expect(quoteCandidates(article.textContent, { quote: '消失。' })).toEqual([])
})
