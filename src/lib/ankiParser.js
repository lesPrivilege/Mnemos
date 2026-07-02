// Anki 纯文本/CSV 导入解析器（Phase 1）。纯函数，不触碰 DOM / localStorage。
// 输出最小卡片形状 { front, back, type, chapter, section }；SRS 字段由 addCard 落库时生成。

// ---- 记录分词（CSV/TSV 状态机，RFC4180 风格）----
// 引号仅在字段起始处才有特殊含义，故未加引号字段里的 HTML 属性引号按字面处理。
export function parseRecords(text, sep) {
  const records = []
  let field = ''
  let record = []
  let inQuotes = false
  let fieldStart = true
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; continue } // 双写转义
        inQuotes = false; continue
      }
      field += ch; continue
    }
    if (ch === '"' && fieldStart) { inQuotes = true; fieldStart = false; continue }
    if (ch === sep) { record.push(field); field = ''; fieldStart = true; continue }
    if (ch === '\r') continue
    if (ch === '\n') { record.push(field); records.push(record); field = ''; record = []; fieldStart = true; continue }
    field += ch; fieldStart = false
  }
  record.push(field)
  records.push(record)
  // 丢掉尾部空记录（单个空字段）
  return records.filter(r => !(r.length === 1 && r[0] === ''))
}

// ---- 头部指令 ----
const DIRECTIVE_RE = /^#(separator|html|tags column|deck column|notetype column|columns|guid column)\s*:(.*)$/i

export function parseHeader(text) {
  const config = { separator: null, html: null, deckCol: null, tagsCol: null, notetypeCol: null, guidCol: null, columns: null }
  const lines = text.split('\n')
  let idx = 0
  for (; idx < lines.length; idx++) {
    const m = lines[idx].replace(/\r$/, '').match(DIRECTIVE_RE)
    if (!m) break
    const key = m[1].toLowerCase()
    const val = m[2].trim()
    if (key === 'separator') config.separator = val
    else if (key === 'html') config.html = /^true$/i.test(val)
    else if (key === 'tags column') config.tagsCol = parseInt(val, 10)
    else if (key === 'deck column') config.deckCol = parseInt(val, 10)
    else if (key === 'notetype column') config.notetypeCol = parseInt(val, 10)
    else if (key === 'guid column') config.guidCol = parseInt(val, 10)
    else if (key === 'columns') config.columns = val
  }
  return { config, dataText: lines.slice(idx).join('\n') }
}

const NAMED_SEP = { tab: '\t', comma: ',', semicolon: ';', pipe: '|', colon: ':', space: ' ' }

export function resolveSeparator(sepValue) {
  if (!sepValue) return null
  const key = sepValue.toLowerCase()
  if (NAMED_SEP[key]) return NAMED_SEP[key]
  if (sepValue === '\\t') return '\t'
  return sepValue[0] // 字面单字符
}

export function sniffSeparator(dataText) {
  const firstLine = dataText.split('\n').find(l => l.trim() !== '') || ''
  if (firstLine.includes('\t')) return '\t'
  if (firstLine.includes(',')) return ','
  if (firstLine.includes(';')) return ';'
  return '\t'
}

// ---- HTML → Markdown ----
const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" }

export function decodeEntities(text) {
  return text
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, m => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
}

export function htmlToMarkdown(html) {
  let s = html
  // img 先于通用标签剥除处理，转成占位（文本导出不含媒体文件）
  s = s.replace(/<img[^>]*\bsrc\s*=\s*["']?([^"'>\s]+)["']?[^>]*>/gi, (_, src) => `[图片: ${src}]`)
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/(div|p)>/gi, '\n').replace(/<(div|p)\b[^>]*>/gi, '')
  s = s.replace(/<(b|strong)\b[^>]*>/gi, '**').replace(/<\/(b|strong)>/gi, '**')
  s = s.replace(/<(i|em)\b[^>]*>/gi, '*').replace(/<\/(i|em)>/gi, '*')
  s = s.replace(/<[^>]+>/g, '') // 剥除其余标签，保留文字
  s = decodeEntities(s)
  return s.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function looksLikeHtml(s) {
  return /<\/?[a-z][\s\S]*?>/i.test(s)
}

// ---- Cloze 挖空 → 正/背面 ----
const CLOZE_RE = /\{\{c\d+::(.*?)(?:::(.*?))?\}\}/g

export function hasCloze(text) {
  return /\{\{c\d+::/.test(text)
}

export function clozeToFrontBack(text) {
  const front = text.replace(CLOZE_RE, (_, ans, hint) => (hint ? `[${hint}]` : '[…]'))
  const back = text.replace(CLOZE_RE, (_, ans) => ans)
  return { front, back }
}

// ---- 字段处理 & deck 拆分 ----
export function processField(raw, isHtml) {
  if (!isHtml) return { text: raw.trim(), images: 0 }
  const images = (raw.match(/<img\b/gi) || []).length
  return { text: htmlToMarkdown(raw), images }
}

export function splitDeck(deckPath) {
  const parts = deckPath.split('::').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return { chapter: '', section: '' }
  if (parts.length === 1) return { chapter: parts[0], section: '' }
  return { chapter: parts[0], section: parts.slice(1).join(' · ') }
}

// ---- 主入口 ----
// 返回 { cards, deckName, stats }。cards 为最小形状，供 Import.jsx 直接复用。
function makeCard(front, back, chapter, section) {
  return {
    front: front.trim(),
    back: back.trim(),
    type: 'recall',
    chapter: chapter || '',
    section: section || '',
  }
}

export function parseAnkiToCards(content, deckName) {
  const { config, dataText } = parseHeader(content)
  const sep = resolveSeparator(config.separator) || sniffSeparator(dataText)
  const records = parseRecords(dataText, sep)

  const cards = []
  const stats = { total: 0, cloze: 0, imagesDropped: 0, tagsDropped: 0, skipped: 0 }
  let suggestedDeck = null
  const metaCols = new Set([config.deckCol, config.tagsCol, config.notetypeCol, config.guidCol].filter(Boolean))

  for (const record of records) {
    const contentFields = []
    let deckVal = null
    let tagVal = null
    record.forEach((f, i) => {
      const col = i + 1
      if (col === config.deckCol) { deckVal = f; return }
      if (col === config.tagsCol) { tagVal = f; return }
      if (metaCols.has(col)) return
      contentFields.push(f)
    })

    if (contentFields.length === 0 || contentFields.every(f => f.trim() === '')) {
      stats.skipped++
      continue
    }

    const isHtml = config.html === true || (config.html === null && contentFields.some(looksLikeHtml))

    if (tagVal && tagVal.trim()) stats.tagsDropped += tagVal.trim().split(/\s+/).length

    let chapter, section
    if (deckVal && deckVal.trim()) {
      const sp = splitDeck(deckVal.trim())
      chapter = sp.chapter
      section = sp.section
      if (!suggestedDeck) suggestedDeck = sp.chapter
    } else {
      chapter = deckName
      section = ''
    }

    let front, back
    if (hasCloze(contentFields[0])) {
      stats.cloze++
      const fb = clozeToFrontBack(contentFields[0])
      const pf = processField(fb.front, isHtml)
      const pb = processField(fb.back, isHtml)
      front = pf.text
      back = pb.text
      stats.imagesDropped += pf.images + pb.images
      const extras = contentFields.slice(1)
        .map(x => { const p = processField(x, isHtml); stats.imagesDropped += p.images; return p.text })
        .filter(Boolean)
      if (extras.length) back += (back ? '\n\n' : '') + extras.join('\n\n')
    } else {
      const pf = processField(contentFields[0], isHtml)
      front = pf.text
      stats.imagesDropped += pf.images
      const parts = contentFields.slice(1)
        .map(x => { const p = processField(x, isHtml); stats.imagesDropped += p.images; return p.text })
        .filter(Boolean)
      back = parts.join('\n\n')
    }

    if (!front.trim()) { stats.skipped++; continue }
    cards.push(makeCard(front, back, chapter, section))
    stats.total++
  }

  return { cards, deckName: suggestedDeck, stats }
}
