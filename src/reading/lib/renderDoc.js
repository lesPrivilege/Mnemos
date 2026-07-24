// Unified rendering pipeline for reading documents
// Wraps shared renderMarkdownAsync for MD, handles TXT, future TEX
// Also extracts TOC (table of contents) from rendered headings

import { renderMarkdownAsync } from '../../lib/renderMarkdown'

/**
 * Render a document to HTML string with heading IDs
 * @param {string} content - raw document content
 * @param {'md'|'tex'|'txt'} format - document format
 * @returns {Promise<string>} sanitized HTML with heading IDs
 */
export async function renderDoc(content, format = 'md') {
  if (!content) return ''

  let html
  switch (format) {
    case 'md':
      html = await renderMarkdownAsync(content)
      break
    case 'tex':
      html = await renderMarkdownAsync(texToMarkdown(content))
      break
    case 'txt':
      html = renderTxt(content)
      break
    default:
      html = await renderMarkdownAsync(content)
  }

  return addHeadingIds(html)
}

/**
 * Extract table of contents from rendered HTML
 * @param {string} html - rendered HTML with heading IDs
 * @returns {{level: number, text: string, id: string}[]}
 */
export function extractToc(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3')
  const toc = []

  for (const h of headings) {
    const level = parseInt(h.tagName[1], 10)
    const text = h.textContent.trim()
    const id = h.getAttribute('id') || slugify(text)
    toc.push({ level, text, id })
  }

  return toc
}

// ── Internal helpers ─────────────────────────────────

/**
 * Convert text to URL-safe slug
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // keep word chars, CJK, spaces, hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

/**
 * Post-process HTML to add id attributes to headings
 */
function addHeadingIds(html) {
  const used = new Set()
  return html.replace(/<h([123])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/g, (match, level, inner) => {
    const text = inner.replace(/<[^>]*>/g, '').trim()
    let id = slugify(text)
    if (!id) return match

    // Deduplicate IDs
    if (used.has(id)) {
      let i = 2
      while (used.has(`${id}-${i}`)) i++
      id = `${id}-${i}`
    }
    used.add(id)

    // Check if heading already has an id
    if (match.includes('id=')) return match
    return `<h${level} id="${id}">${inner}</h${level}>`
  })
}

/**
 * TeX → Markdown simplified converter
 * Covers: headings, math environments, formatting commands, lists, comments
 * Not a full TeX parser — designed for reading math textbooks
 */
function texToMarkdown(tex) {
  let md = tex

  // Strip document preamble and closing
  md = md.replace(/\\documentclass\{[^}]*\}/g, '')
  md = md.replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '')
  md = md.replace(/\\begin\{document\}/g, '')
  md = md.replace(/\\end\{document\}/g, '')
  md = md.replace(/\\title\{([^}]*)\}/g, '# $1')
  md = md.replace(/\\author\{([^}]*)\}/g, '')

  // Headings
  md = md.replace(/\\chapter\{([^}]*)\}/g, '# $1')
  md = md.replace(/\\section\{([^}]*)\}/g, '## $1')
  md = md.replace(/\\subsection\{([^}]*)\}/g, '### $1')
  md = md.replace(/\\subsubsection\{([^}]*)\}/g, '#### $1')

  // Math environments → display math
  md = md.replace(/\\begin\{equation\*?\}/g, '\n$$')
  md = md.replace(/\\end\{equation\*?\}/g, '$$\n')
  md = md.replace(/\\begin\{align\*?\}/g, '\n$$\\begin{aligned}')
  md = md.replace(/\\end\{align\*?\}/g, '\\end{aligned}$$\n')
  md = md.replace(/\\begin\{eqnarray\*?\}/g, '\n$$\\begin{aligned}')
  md = md.replace(/\\end\{eqnarray\*?\}/g, '\\end{aligned}$$\n')

  // Theorem-like environments → blockquotes
  const envs = ['theorem', 'definition', 'lemma', 'proposition', 'corollary', 'remark', 'example', 'proof']
  for (const env of envs) {
    const label = env.charAt(0).toUpperCase() + env.slice(1)
    md = md.replace(new RegExp(`\\\\begin\\{${env}\\}(\\[([^\\]]*)\\])?`, 'g'),
      (_, _2, note) => `> **${label}${note ? ` (${note})` : ''}**\n>`)
    md = md.replace(new RegExp(`\\\\end\\{${env}\\}`, 'g'), '')
  }

  // Lists
  md = md.replace(/\\begin\{itemize\}/g, '')
  md = md.replace(/\\end\{itemize\}/g, '')
  md = md.replace(/\\begin\{enumerate\}/g, '')
  md = md.replace(/\\end\{enumerate\}/g, '')
  md = md.replace(/\\item\s/g, '- ')

  // Inline formatting
  md = md.replace(/\\textbf\{([^}]*)\}/g, '**$1**')
  md = md.replace(/\\textit\{([^}]*)\}/g, '*$1*')
  md = md.replace(/\\emph\{([^}]*)\}/g, '*$1*')
  md = md.replace(/\\texttt\{([^}]*)\}/g, '`$1`')

  // Strip comments (lines starting with %)
  md = md.replace(/^%.*$/gm, '')

  // Strip labels and refs
  md = md.replace(/\\label\{[^}]*\}/g, '')
  md = md.replace(/\\ref\{[^}]*\}/g, '[ref]')
  md = md.replace(/\\eqref\{[^}]*\}/g, '[ref]')

  // Strip common commands
  md = md.replace(/\\newcommand\{[^}]*\}\{[^}]*\}/g, '')
  md = md.replace(/\\renewcommand\{[^}]*\}\{[^}]*\}/g, '')
  md = md.replace(/\\centering/g, '')
  md = md.replace(/\\hfill/g, '')

  // Clean up excess blank lines
  md = md.replace(/\n{3,}/g, '\n\n')

  return md.trim()
}

/**
 * Plain text → HTML
 */
function renderTxt(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<pre style="white-space: pre-wrap; word-break: break-word; font-family: var(--font-mono); font-size: var(--text-lg); line-height: 1.7;">${escaped}</pre>`
}
