// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { renderMarkdownAsync } from './renderMarkdown'
it('preserves trusted math layout while removing user HTML styles and handlers', async () => {
  const html = await renderMarkdownAsync('$$\\begin{pmatrix}2&0\\\\0&3\\end{pmatrix}$$\n\n<span style="position:fixed" onclick="alert(1)">text</span>')
  expect(html).toContain('mtable')
  expect(html).toMatch(/style="[^"]*(height|top):/)
  expect(html).not.toContain('position:fixed')
  expect(html).not.toContain('onclick')
})
it('does not enable trusted TeX links or HTML extensions', async () => {
  const html = await renderMarkdownAsync('$\\href{javascript:alert(1)}{click}$\n\n$\\htmlStyle{position:fixed}{x}$')
  const root = document.createElement('div')
  root.innerHTML = html
  expect(root.querySelector('a[href^="javascript:"]')).toBeNull()
  expect(root.querySelector('[style*="position:fixed"]')).toBeNull()
  expect(root.querySelector('script')).toBeNull()
})
