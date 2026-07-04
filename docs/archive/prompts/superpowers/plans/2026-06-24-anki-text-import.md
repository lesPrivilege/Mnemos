# Anki 纯文本/CSV 导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Mnemos 闪卡能导入 Anki「导出 → Notes in Plain Text」产出的 `.txt` / `.csv`，作为迁移通道。

**Architecture:** 新增纯函数模块 `src/lib/ankiParser.js`，把 Anki 文本解析为与 `parseMdToCards` 同形的最小卡片 `{ front, back, type, chapter, section }`，从而零改动复用 `Import.jsx` 现有的预览 / 去重 / `handleConfirmMd` 落库流程。模块按职责拆成可独立单测的小函数（分词、头部、HTML、cloze、字段、主装配），最后在 `Import.jsx` 接一个次级入口。

**Tech Stack:** React + Vite（ESM, `"type":"module"`）、vitest（本计划引入，仅用于单测纯解析器）。无新运行时依赖。

---

## Preconditions（执行前必读）

工作区当前有**与本功能无关的未提交改动**（会话开始时的 `git status`）：

```
M index.html, package-lock.json, package.json, src/App.jsx,
  src/components/Icons.jsx, src/pages/DeckDetail.jsx
?? docs/mindmap-integration.md, src/mindmap/
```

- [ ] **P0：先清干净工作区。** 把上述无关改动**单独提交**或 `git stash`，使本计划的每个 commit 保持原子。Task 1 会 `npm install -D vitest`，这会再次改动 `package.json` / `package-lock.json`——若不先处理，vitest 的提交会把别人的改动一起卷进来，违反项目「一个逻辑改动 = 一个 commit」与「精确 stage」规则。

> 注：已提交的设计 spec 在 `docs/superpowers/specs/2026-06-24-anki-text-import-design.md`，本计划是它的落地。

## File Structure

| 文件 | 职责 |
|---|---|
| `src/lib/ankiParser.js`（新增） | 纯解析器。导出 `parseAnkiToCards` 主入口 + 各小函数（`parseRecords` / `parseHeader` / `resolveSeparator` / `sniffSeparator` / `decodeEntities` / `htmlToMarkdown` / `looksLikeHtml` / `hasCloze` / `clozeToFrontBack` / `processField` / `splitDeck`）。每个小函数单一职责、可独立测。 |
| `src/lib/ankiParser.test.js`（新增） | vitest 单测，按小函数分 `describe`，最后一组是 `parseAnkiToCards` 集成测试。 |
| `src/pages/Import.jsx`（改） | 「闪卡·MD」tab 下新增「从 Anki 迁移」次级入口；`.txt/.csv` 路由到解析器；预览页展示 stats。 |
| `package.json` / `package-lock.json`（改） | 加 `vitest` devDep 与 `"test": "vitest run"`。 |

**卡片形状（关键约定）：** 解析器只产出 `{ front, back, type:'recall', chapter, section }`。这是 `handleConfirmMd`（`addCard(deck.id, card.front, card.back, card.type, card.chapter, card.section)`）、`dedup`（读 `c.front`）、预览（读 `card.front`）唯一消费的字段；id / easiness / dueDate 等 SRS 字段由 `addCard` 在落库时重建，故解析器无需生成，也不依赖 `crypto` / `dateUtils`。

---

### Task 1: 引入 vitest + CSV/TSV 分词器 `parseRecords`

**Files:**
- Create: `src/lib/ankiParser.js`
- Create: `src/lib/ankiParser.test.js`
- Modify: `package.json`（scripts + devDependencies）

- [ ] **Step 1: 安装 vitest 并加 test 脚本**

Run:
```bash
npm install -D vitest
```
然后在 `package.json` 的 `"scripts"` 中加一行（与 `dev`/`build`/`preview` 并列）：
```json
"test": "vitest run"
```
vitest 零配置复用现有 `vite.config.js`，默认 node 环境，足够测纯函数。

- [ ] **Step 2: 写失败测试**

Create `src/lib/ankiParser.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { parseRecords } from './ankiParser'

describe('parseRecords', () => {
  it('splits simple TSV into records', () => {
    expect(parseRecords('a\tb\nc\td', '\t')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('ignores a trailing newline', () => {
    expect(parseRecords('a\tb\n', '\t')).toEqual([['a', 'b']])
  })
  it('honors a comma separator', () => {
    expect(parseRecords('a,b', ',')).toEqual([['a', 'b']])
  })
  it('keeps the separator inside quoted fields', () => {
    expect(parseRecords('"a, b",c', ',')).toEqual([['a, b', 'c']])
  })
  it('unescapes doubled quotes', () => {
    expect(parseRecords('"say ""hi""",x', ',')).toEqual([['say "hi"', 'x']])
  })
  it('keeps newlines inside quoted fields', () => {
    expect(parseRecords('"l1\nl2"\tb', '\t')).toEqual([['l1\nl2', 'b']])
  })
  it('treats quotes not at field start as literal (HTML attrs)', () => {
    expect(parseRecords('<img src="x">\tb', '\t')).toEqual([['<img src="x">', 'b']])
  })
})
```

- [ ] **Step 3: 运行，确认失败**

Run: `npm test`
Expected: FAIL — `ankiParser.js` 不存在 / 无 `parseRecords` 导出。

- [ ] **Step 4: 实现 `parseRecords`**

Create `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 5: 运行，确认通过**

Run: `npm test`
Expected: PASS（7 个 parseRecords 用例全绿）。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "chore: add vitest and Anki CSV/TSV tokenizer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 头部指令与分隔符（`parseHeader` / `resolveSeparator` / `sniffSeparator`）

**Files:**
- Modify: `src/lib/ankiParser.js`
- Modify: `src/lib/ankiParser.test.js`

- [ ] **Step 1: 追加失败测试**

Append to `src/lib/ankiParser.test.js`（并在顶部 import 增加这三个名字）:
```js
// 顶部 import 改为：
// import { parseRecords, parseHeader, resolveSeparator, sniffSeparator } from './ankiParser'

describe('parseHeader', () => {
  it('extracts directives and strips them from the data body', () => {
    const { config, dataText } = parseHeader('#separator:tab\n#html:true\nQ\tA')
    expect(config.separator).toBe('tab')
    expect(config.html).toBe(true)
    expect(dataText).toBe('Q\tA')
  })
  it('parses column directives as 1-indexed numbers', () => {
    const { config } = parseHeader('#deck column:3\n#tags column:5\nx')
    expect(config.deckCol).toBe(3)
    expect(config.tagsCol).toBe(5)
  })
  it('leaves html null when no directive is present', () => {
    const { config, dataText } = parseHeader('Q\tA')
    expect(config.html).toBe(null)
    expect(dataText).toBe('Q\tA')
  })
})

describe('resolveSeparator', () => {
  it('maps named separators (case-insensitive)', () => {
    expect(resolveSeparator('tab')).toBe('\t')
    expect(resolveSeparator('comma')).toBe(',')
    expect(resolveSeparator('Pipe')).toBe('|')
  })
  it('returns null when empty', () => {
    expect(resolveSeparator(null)).toBe(null)
  })
})

describe('sniffSeparator', () => {
  it('prefers tab, then comma, else defaults to tab', () => {
    expect(sniffSeparator('a\tb')).toBe('\t')
    expect(sniffSeparator('a,b')).toBe(',')
    expect(sniffSeparator('plain')).toBe('\t')
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: FAIL — 无 `parseHeader` / `resolveSeparator` / `sniffSeparator` 导出。

- [ ] **Step 3: 实现这三个函数**

Append to `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test`
Expected: PASS（parseRecords + 新增三组全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "feat: parse Anki header directives and separators

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: HTML → Markdown（`decodeEntities` / `htmlToMarkdown` / `looksLikeHtml`）

**Files:**
- Modify: `src/lib/ankiParser.js`
- Modify: `src/lib/ankiParser.test.js`

- [ ] **Step 1: 追加失败测试**

Append to `src/lib/ankiParser.test.js`（顶部 import 增加 `decodeEntities, htmlToMarkdown, looksLikeHtml`）:
```js
describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b &lt;x&gt; &#65;')).toBe('a & b <x> A')
  })
})

describe('htmlToMarkdown', () => {
  it('converts bold and italic', () => {
    expect(htmlToMarkdown('<b>B</b> <i>I</i>')).toBe('**B** *I*')
  })
  it('converts br to newline', () => {
    expect(htmlToMarkdown('a<br>b')).toBe('a\nb')
  })
  it('replaces img with a text placeholder', () => {
    expect(htmlToMarkdown('<img src="cat.jpg">x')).toBe('[图片: cat.jpg]x')
  })
  it('strips unknown tags but keeps their text', () => {
    expect(htmlToMarkdown('<span class="c">hi</span>')).toBe('hi')
  })
})

describe('looksLikeHtml', () => {
  it('detects tags vs plain text', () => {
    expect(looksLikeHtml('<b>x</b>')).toBe(true)
    expect(looksLikeHtml('plain')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: FAIL — 无 `decodeEntities` / `htmlToMarkdown` / `looksLikeHtml` 导出。

- [ ] **Step 3: 实现**

Append to `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test`
Expected: PASS（新增 7 个用例全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "feat: convert Anki HTML fields to markdown

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Cloze 挖空（`hasCloze` / `clozeToFrontBack`）

**Files:**
- Modify: `src/lib/ankiParser.js`
- Modify: `src/lib/ankiParser.test.js`

- [ ] **Step 1: 追加失败测试**

Append to `src/lib/ankiParser.test.js`（顶部 import 增加 `hasCloze, clozeToFrontBack`）:
```js
describe('cloze', () => {
  it('detects cloze markers', () => {
    expect(hasCloze('x {{c1::y}}')).toBe(true)
    expect(hasCloze('plain')).toBe(false)
  })
  it('hides answer on front, reveals on back, using hint when given', () => {
    expect(clozeToFrontBack('Capital is {{c1::Paris::city}}.')).toEqual({
      front: 'Capital is [city].',
      back: 'Capital is Paris.',
    })
  })
  it('uses an ellipsis placeholder when no hint', () => {
    expect(clozeToFrontBack('{{c1::Paris}}')).toEqual({ front: '[…]', back: 'Paris' })
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: FAIL — 无 `hasCloze` / `clozeToFrontBack` 导出。

- [ ] **Step 3: 实现**

Append to `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "feat: convert Anki cloze notes to front/back cards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 字段处理与 deck 拆分（`processField` / `splitDeck`）

**Files:**
- Modify: `src/lib/ankiParser.js`
- Modify: `src/lib/ankiParser.test.js`

- [ ] **Step 1: 追加失败测试**

Append to `src/lib/ankiParser.test.js`（顶部 import 增加 `processField, splitDeck`）:
```js
describe('processField', () => {
  it('trims plain text when not html', () => {
    expect(processField('  hi  ', false)).toEqual({ text: 'hi', images: 0 })
  })
  it('converts html and counts images', () => {
    expect(processField('<b>x</b><img src="a.png">', true)).toEqual({
      text: '**x**[图片: a.png]',
      images: 1,
    })
  })
})

describe('splitDeck', () => {
  it('maps a single deck to chapter', () => {
    expect(splitDeck('Geo')).toEqual({ chapter: 'Geo', section: '' })
  })
  it('maps a deck hierarchy to chapter/section', () => {
    expect(splitDeck('Geo::Europe::France')).toEqual({ chapter: 'Geo', section: 'Europe · France' })
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: FAIL — 无 `processField` / `splitDeck` 导出。

- [ ] **Step 3: 实现**

Append to `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 4: 运行，确认通过**

Run: `npm test`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "feat: add Anki field processor and deck-path splitter

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 主装配 `parseAnkiToCards`

**Files:**
- Modify: `src/lib/ankiParser.js`
- Modify: `src/lib/ankiParser.test.js`

- [ ] **Step 1: 追加失败测试（集成）**

Append to `src/lib/ankiParser.test.js`（顶部 import 增加 `parseAnkiToCards`）:
```js
describe('parseAnkiToCards', () => {
  it('parses headerless TSV with the fallback chapter = deckName', () => {
    const { cards } = parseAnkiToCards('F1\tB1\nF2\tB2', 'MyDeck')
    expect(cards).toEqual([
      { front: 'F1', back: 'B1', type: 'recall', chapter: 'MyDeck', section: '' },
      { front: 'F2', back: 'B2', type: 'recall', chapter: 'MyDeck', section: '' },
    ])
  })
  it('maps a deck column to chapter/section and suggests a deck name', () => {
    const r = parseAnkiToCards('#separator:tab\n#deck column:3\nQ\tA\tGeo::Europe', 'X')
    expect(r.cards[0]).toMatchObject({ chapter: 'Geo', section: 'Europe' })
    expect(r.deckName).toBe('Geo')
  })
  it('drops a tags column and counts the tags', () => {
    const r = parseAnkiToCards('#separator:tab\n#tags column:3\nQ\tA\tt1 t2', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'Q', back: 'A' })
    expect(r.stats.tagsDropped).toBe(2)
  })
  it('converts html fields to markdown', () => {
    const r = parseAnkiToCards('#separator:tab\n#html:true\n<b>Q</b>\t<i>A</i>', 'X')
    expect(r.cards[0]).toMatchObject({ front: '**Q**', back: '*A*' })
  })
  it('converts a cloze note and counts it', () => {
    const r = parseAnkiToCards('#separator:tab\n#html:false\nCapital is {{c1::Paris}}.', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'Capital is […].', back: 'Capital is Paris.' })
    expect(r.stats.cloze).toBe(1)
  })
  it('joins extra content fields into the back', () => {
    const r = parseAnkiToCards('a\tb\tc', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'a', back: 'b\n\nc' })
  })
  it('returns no cards for empty input', () => {
    expect(parseAnkiToCards('', 'X').cards).toEqual([])
  })
  it('skips blank records and counts them', () => {
    const r = parseAnkiToCards('Q\tA\n\t\nQ2\tA2', 'X')
    expect(r.cards).toHaveLength(2)
    expect(r.stats.skipped).toBe(1)
  })
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `npm test`
Expected: FAIL — 无 `parseAnkiToCards` 导出。

- [ ] **Step 3: 实现主入口**

Append to `src/lib/ankiParser.js`:
```js
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
```

- [ ] **Step 4: 运行，确认全部通过**

Run: `npm test`
Expected: PASS（全文件所有 describe 全绿）。

- [ ] **Step 5: 提交**

```bash
git add src/lib/ankiParser.js src/lib/ankiParser.test.js
git commit -m "feat: assemble parseAnkiToCards entrypoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Import.jsx 接入「从 Anki 迁移」次级入口

无单测（UI/集成层）。验收 = `npm run build` 通过 + 手动冒烟。逐处编辑均给出锚点。

**Files:**
- Modify: `src/pages/Import.jsx`

- [ ] **Step 1: 引入解析器**

在 `src/pages/Import.jsx` 第 7 行 `import { parseMdToCards } from '../lib/mdParser'` 之后新增一行：
```js
import { parseAnkiToCards } from '../lib/ankiParser'
```

- [ ] **Step 2: 加 Anki 文件 input 的 ref**

找到（约 18 行）：
```js
  const fileInputRef = useRef(null)
```
改为：
```js
  const fileInputRef = useRef(null)
  const ankiInputRef = useRef(null)
```

- [ ] **Step 3: `handleFileDrop` 支持 .txt/.csv 与 .apkg 提示**

找到 `handleFileDrop` 内 reading 分支之后、创建 reader 之前的位置，在 reading `if` 块后新增 apkg 早退：
```js
    if (importTab === 'reading' && ['md', 'tex', 'txt'].includes(ext)) {
      processReadingFile(file)
      return
    }
    if (importTab === 'md' && ext === 'apkg') {
      alert('.apkg 即将支持。请先在 Anki 中「文件 → 导出 → Notes in Plain Text」生成 .txt 或 .csv。')
      return
    }
```
再在 `reader.onload` 里的 `else if (ext === 'md') { ... }` 之后追加分支：
```js
      } else if (ext === 'md') {
        processMd(ev.target.result, file.name.replace(/\.md$/i, ''))
      } else if (ext === 'txt' || ext === 'csv') {
        processAnki(ev.target.result, file.name.replace(/\.(txt|csv)$/i, ''))
      }
```

- [ ] **Step 4: 加 `processAnki` 与 `handleAnkiFile`**

在 `processMd` 函数（约 162–170 行）之后新增：
```js
  const processAnki = (content, defaultName) => {
    const { cards, deckName, stats } = parseAnkiToCards(content, defaultName)
    if (cards.length === 0) {
      alert('未识别到 Anki 卡片。请在 Anki 中「文件 → 导出 → Notes in Plain Text」生成 .txt 或 .csv。')
      return
    }
    setMdPreview({ cards, defaultName: deckName || defaultName, ankiStats: stats })
    setMdDeckName(mdTargetDeck?.name || deckName || defaultName)
  }

  const handleAnkiFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => processAnki(ev.target.result, file.name.replace(/\.(txt|csv)$/i, ''))
    reader.readAsText(file)
    e.target.value = ''
  }
```

- [ ] **Step 5: 预览页展示 Anki stats**

找到 MD 预览里的「解析卡片」行（约 399 行）：
```jsx
            <div className="kv-row"><span className="k">解析卡片</span><span className="v">{mdPreview.cards.length}</span></div>
```
在其**后面**插入：
```jsx
            {mdPreview.ankiStats && (
              <>
                {mdPreview.ankiStats.cloze > 0 && (
                  <div className="kv-row"><span className="k">挖空卡转换</span><span className="v">{mdPreview.ankiStats.cloze}</span></div>
                )}
                {mdPreview.ankiStats.imagesDropped > 0 && (
                  <div className="kv-row"><span className="k">忽略图片</span><span className="v" style={{ color: 'var(--warn)' }}>{mdPreview.ankiStats.imagesDropped}</span></div>
                )}
                {mdPreview.ankiStats.tagsDropped > 0 && (
                  <div className="kv-row"><span className="k">忽略标签</span><span className="v" style={{ color: 'var(--warn)' }}>{mdPreview.ankiStats.tagsDropped}</span></div>
                )}
                {mdPreview.ankiStats.skipped > 0 && (
                  <div className="kv-row"><span className="k">跳过坏行</span><span className="v" style={{ color: 'var(--warn)' }}>{mdPreview.ankiStats.skipped}</span></div>
                )}
              </>
            )}
```

- [ ] **Step 6: 在「闪卡·MD」tab 加「从 Anki 迁移」卡片**

找到 md 分支末尾的隐藏 md input（约 606 行）：
```jsx
            <input ref={fileInputRef} type="file" accept=".md" onChange={handleMdFile} className="hidden" />
```
将其替换为：
```jsx
            <div className="settings-card">
              <div className="lbl">从 Anki 迁移 · MIGRATE</div>
              <div className="kv-row"><span className="k">来源</span><span className="v">Anki 纯文本 / CSV 导出</span></div>
              <div onClick={() => ankiInputRef.current?.click()}
                className="dropzone">
                <div className="icon"><UploadIcon size={18} /></div>
                <div className="label">选择 Anki 导出文件</div>
                <div className="ext">.TXT · .CSV</div>
              </div>
              <div className="text-[11px] text-ink-3 leading-relaxed font-zh mt-1 tracking-[0.03em]">
                Anki：文件 → 导出 → 「Notes in Plain Text」。.apkg 即将支持。
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept=".md" onChange={handleMdFile} className="hidden" />
            <input ref={ankiInputRef} type="file" accept=".txt,.csv" onChange={handleAnkiFile} className="hidden" />
```

- [ ] **Step 7: 构建验证**

Run: `npm run build`
Expected: vite build 成功，无报错。

- [ ] **Step 8: 手动冒烟（可选但推荐）**

Run: `npm run dev`，进入「导入 → 闪卡·MD」，用下述样例存成 `sample.txt` 选择导入，确认预览出现 2 张卡、deck 建议为 `Geo`、有「忽略标签」提示，确认导入后落入卡组：
```
#separator:tab
#html:true
#deck column:3
#tags column:4
<b>Capital of France?</b>	{{c1::Paris}}	Geo::Europe	t1 t2
2+2?	<i>4</i>	Geo::Math	mathtag
```

- [ ] **Step 9: 提交**

```bash
git add src/pages/Import.jsx
git commit -m "feat: import Anki text/CSV exports from the flashcard tab

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage**（对照 `…specs/2026-06-24-anki-text-import-design.md`）：
- §3a 头部指令 → Task 2 ✓；§3b 分隔符 → Task 2 ✓；§3c CSV 引号 → Task 1 ✓；§3d 列映射 → Task 6 ✓；§3e HTML→MD（含 img 占位）→ Task 3 ✓；§3f Cloze → Task 4 ✓；§3g Deck→章节 → Task 5+6 ✓；§3h Tags 丢弃计数 → Task 6 ✓。
- §4 UI（次级入口 / `.txt,.csv` 路由 / stats 展示 / 主 dropzone 不动）→ Task 7 ✓。
- §5 错误处理（空文件 alert / 坏行跳过计数 / .apkg 提示）→ Task 6（skipped）+ Task 7（alert、apkg）✓。
- §6 测试（vitest + TDD + 用例清单）→ Task 1–6 ✓。
- §7 文件清单四项全覆盖 ✓。

**2. Placeholder scan：** 无 TBD/TODO；每个 code step 均含完整代码。✓

**3. Type consistency：** 函数名与签名跨任务一致——`parseRecords(text, sep)`、`parseHeader(text)→{config,dataText}`、`config.{separator,html,deckCol,tagsCol,notetypeCol,guidCol,columns}`、`resolveSeparator`/`sniffSeparator`、`htmlToMarkdown`/`decodeEntities`/`looksLikeHtml`、`hasCloze`/`clozeToFrontBack`→{front,back}、`processField(raw,isHtml)→{text,images}`、`splitDeck→{chapter,section}`、`parseAnkiToCards(content,deckName)→{cards,deckName,stats}`，`stats.{total,cloze,imagesDropped,tagsDropped,skipped}`。Import.jsx 消费 `mdPreview.ankiStats` 字段与 stats 一致。✓
