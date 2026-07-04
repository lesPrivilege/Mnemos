// Export highlights as markdown, grouped under document headings
import { extractToc } from './renderDoc'
import { S } from '../../lib/strings'

/**
 * @param {object} doc — { title }
 * @param {object[]} highlights — [{ selectedText, contextSnippet, createdAt }]
 * @param {string} html — rendered HTML (for TOC extraction and section splitting)
 * @returns {string} markdown
 */
export function exportHighlightsMd(doc, highlights, html) {
  if (!highlights.length) return ''

  const toc = extractToc(html)
  // Use rendered text from HTML for section splitting
  const parser = new DOMParser()
  const htmlDoc = parser.parseFromString(html, 'text/html')
  const bodyText = htmlDoc.body?.textContent || ''
  const sections = splitByHeadings(bodyText, toc)

  // Group highlights under the best-matching heading
  const groups = []
  const unmatched = []

  for (const h of highlights) {
    let matched = false
    for (const sec of sections) {
      if (sec.text.includes(h.selectedText)) {
        let group = groups.find(g => g.heading === sec.heading)
        if (!group) {
          group = { heading: sec.heading, level: sec.level, items: [] }
          groups.push(group)
        }
        group.items.push(h)
        matched = true
        break
      }
    }
    if (!matched) unmatched.push(h)
  }

  // Sort groups by heading level order
  groups.sort((a, b) => a._order - b._order)

  const lines = [S.exportHighlights.titleHeading(doc.title), '', S.exportHighlights.countLine(highlights.length, new Date().toLocaleDateString()), '']

  for (const g of groups) {
    lines.push(`${'#'.repeat(Math.min(g.level + 1, 4))} ${g.heading}`, '')
    for (const item of g.items) {
      lines.push(`> ${item.selectedText}`)
      if (item.note) lines.push(`> *${item.note}*`)
      lines.push('')
    }
  }

  if (unmatched.length) {
    lines.push(S.exportHighlights.otherHeading, '')
    for (const item of unmatched) {
      lines.push(`> ${item.selectedText}`, '')
    }
  }

  return lines.join('\n')
}

function splitByHeadings(content, toc) {
  if (!toc.length) return [{ heading: '', level: 0, text: content, _order: 0 }]

  const sections = []
  let remaining = content

  for (let i = 0; i < toc.length; i++) {
    const h = toc[i]
    const nextH = toc[i + 1]
    const startIdx = remaining.indexOf(h.text)
    if (startIdx === -1) continue

    const afterHeading = remaining.slice(startIdx)
    let endIdx = afterHeading.length
    if (nextH) {
      const nextIdx = afterHeading.indexOf(nextH.text, h.text.length)
      if (nextIdx !== -1) endIdx = nextIdx
    }

    sections.push({
      heading: h.text,
      level: h.level,
      text: afterHeading.slice(0, endIdx),
      _order: i,
    })
  }

  if (!sections.length) {
    sections.push({ heading: '', level: 0, text: content, _order: 0 })
  }

  return sections
}
