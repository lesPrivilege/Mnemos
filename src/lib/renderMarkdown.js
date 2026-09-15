import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.use({ breaks: true, gfm: true })

let katexModule = null
let katexLoadPromise = null
let mathFragments = null

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderKatex(latex, displayMode = false) {
  if (!katexModule) {
    return `<code>${escapeHtml(latex)}</code>`
  }
  try {
    const html = katexModule.renderToString(latex, { displayMode, output: 'html', throwOnError: false, trust: false })
    // Only KaTeX-generated markup bypasses prose sanitization. Its positioning
    // styles are necessary for fractions and matrices; user HTML stays filtered.
    const marker = `mnemos-math-${crypto.randomUUID()}`
    mathFragments.set(marker, html)
    return `<span class="${marker}"></span>`
  } catch {
    return `<code class="katex-error">${escapeHtml(latex)}</code>`
  }
}

function shouldLoadKatex(raw) {
  return typeof raw === 'string' && raw.includes('$')
}

async function ensureKatex(raw) {
  if (!shouldLoadKatex(raw) || katexModule) return
  if (!katexLoadPromise) {
    katexLoadPromise = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([katex]) => {
      katexModule = katex.default
    })
  }
  await katexLoadPromise
}

marked.use({
  extensions: [
    {
      name: 'mathBlock',
      level: 'block',
      start(src) {
        return src.match(/\$\$/)?.index
      },
      tokenizer(src) {
        const match = src.match(/^\$\$[ \t]*\n?([\s\S]+?)\n?\$\$(?:\n|$)/)
        if (!match) return false
        const latex = match[1].trim()
        if (!latex) return false
        return {
          type: 'mathBlock',
          raw: match[0],
          text: latex,
        }
      },
      renderer(token) {
        return `<div class="katex-display">${renderKatex(token.text, true)}</div>`
      },
    },
    {
      name: 'mathInline',
      level: 'inline',
      start(src) {
        return src.match(/\$/)?.index
      },
      tokenizer(src) {
        if (src.startsWith('$$')) return false

        const match = src.match(/^\$([^\s$](?:\\.|[^$])*?)\$(?![\d])/)
        if (!match) return false

        const latex = match[1].trim()
        if (!latex) return false

        return {
          type: 'mathInline',
          raw: match[0],
          text: latex,
        }
      },
      renderer(token) {
        return renderKatex(token.text)
      },
    },
  ],
  renderer: {
    codespan({ text }) {
      const trimmed = text.trim()
      if (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length >= 2) {
        const latex = trimmed.slice(1, -1).trim()
        return renderKatex(latex)
      }
      return `<code>${escapeHtml(text)}</code>`
    },
    code({ text, lang }) {
      const trimmed = text.trim()
      if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
        const latex = trimmed.slice(2, -2).trim()
        return `<div class="katex-display">${renderKatex(latex, true)}</div>`
      }
      const language = lang ? String(lang).replace(/[^a-zA-Z0-9_-]/g, '') : ''
      return `<pre><code${language ? ` class="language-${language}"` : ''}>${escapeHtml(text)}</code></pre>`
    },
  },
})

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p','br','strong','em','code','pre','ul','ol','li','table','thead','tbody','tr','th','td','blockquote','hr','span','div','a','h1','h2','h3','h4','img'],
  ALLOWED_ATTR: ['class','href','target','rel','src','alt','title','width','height'],
}

export function preloadKatex() {
  ensureKatex('$')
}

export async function renderMarkdownAsync(raw) {
  await ensureKatex(raw)
  try {
    mathFragments = new Map()
    const html = marked.parse(raw)
    let clean = DOMPurify.sanitize(html, SANITIZE_CONFIG)
    for (const [marker, fragment] of mathFragments) {
      clean = clean.replace(`<span class="${marker}"></span>`, () => fragment)
    }
    return clean
  } catch {
    return DOMPurify.sanitize(`<p>${String(raw)}</p>`, SANITIZE_CONFIG)
  } finally {
    mathFragments = null
  }
}
