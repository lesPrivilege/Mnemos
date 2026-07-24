/**
 * collate.mjs — 死校 (collate) gate runner.
 *
 * Four gates, per docs/design-kanli.md §九 and docs/design-collation.md 记-03:
 *   1. 对校·底本单源 (source-single)  — no color/radius/easing/duration literals outside tokens.css
 *   2. 避讳·字面 (taboo)              — gradients, glass, overshoot easing, layout-property motion, copy taboo
 *   3. 对校·对比度 (contrast)         — WCAG contrast for the token pair table, both themes
 *   4. 牌记完整 (paiji)               — build carries version + commit (__MNEMOS_BUILD__)
 *
 * Plain Node ESM, zero dependencies. Baseline (scripts/collate/baseline.json)
 * is shrink-only: a violation covered by a baseline entry WARNs instead of
 * failing; a baseline entry that no longer matches anything FAILs ("stale —
 * remove entry"). There is no --update-baseline flag, by design — entries are
 * hand-curated against docs/design-collation.md 记-03.
 *
 * Usage:
 *   node scripts/collate/collate.mjs               — scan src/, write docs/contrast-table.md
 *   node scripts/collate/collate.mjs --self-test    — run every detector against fixtures/ (阴性对照)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'

import { contrastRatio, parseColorToken } from './wcag.mjs'

// ─────── paths ───────

const __dirname = fileURLToPath(new URL('.', import.meta.url))
export const ROOT = join(__dirname, '..', '..')
export const SRC_DIR = join(ROOT, 'src')
export const FIXTURES_DIR = join(__dirname, 'fixtures')
export const BASELINE_PATH = join(__dirname, 'baseline.json')
export const TOKENS_PATH = join(SRC_DIR, 'styles', 'tokens.css')
export const VITE_CONFIG_PATH = join(ROOT, 'vite.config.js')
export const CONTRAST_TABLE_PATH = join(ROOT, 'docs', 'contrast-table.md')

// ─────── small utilities ───────

function toPosixRel(base, full) {
  return relative(base, full).split(sep).join('/')
}

function walk(rootDir) {
  const out = []
  function recur(dir) {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) recur(full)
      else out.push(full)
    }
  }
  recur(rootDir)
  return out
}

/** Scan `rootDir` for the `{css,jsx,js}` file set the collate gates operate on. */
export function scanRootFiles(rootDir, { excludeRelPaths = [] } = {}) {
  const exts = new Set(['.css', '.jsx', '.js'])
  return walk(rootDir)
    .filter((f) => exts.has(extname(f)))
    .filter((f) => !f.endsWith('.test.js'))
    .filter((f) => !excludeRelPaths.includes(toPosixRel(rootDir, f)))
}

function findLineNumber(text, index) {
  let line = 1
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++
  }
  return line
}

/** Windowed snippet centered on a match, clipped to its own physical line. */
function snippetAround(text, index, matchLen = 1, radius = 55) {
  const lineStart = text.lastIndexOf('\n', index) + 1
  let lineEnd = text.indexOf('\n', index)
  if (lineEnd === -1) lineEnd = text.length
  const winStart = Math.max(lineStart, index - radius)
  const winEnd = Math.min(lineEnd, index + matchLen + radius)
  let snippet = text.slice(winStart, winEnd).trim()
  if (winStart > lineStart) snippet = '…' + snippet
  if (winEnd < lineEnd) snippet = snippet + '…'
  return snippet
}

function makeViolation(gate, id, rootDir, filePath, text, index, matchLen = 1) {
  return {
    gate,
    id,
    file: toPosixRel(rootDir, filePath),
    line: findLineNumber(text, index),
    match: snippetAround(text, index, matchLen),
  }
}

// ════════════════════════════════════════════════════════════════
// Gate 1 · 对校·底本单源 (source-single)
// ════════════════════════════════════════════════════════════════

const HEX_COLOR_RE =
  /(?<![\w&#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g
const COLOR_FN_RE = /\b(?:oklch|rgba?|hsla?)\(/g
const CUBIC_BEZIER_CALL_RE =
  /cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g
const RADIUS_CSS_RE = /\bborder-radius\s*:\s*([^;}]+)(?=[;}])/g
const RADIUS_JS_KEY_RE = /\bborderRadius\s*:\s*/g
const DURATION_PROP_RE = /\b(?:transition|animation)(?:-duration|Duration)?\s*:/g

function isOffendingRadiusValue(raw) {
  let value = raw.trim()
  const quoteMatch = /^(['"`])([\s\S]*)\1$/.exec(value)
  if (quoteMatch) value = quoteMatch[2].trim()
  if (value === '') return false
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return parseFloat(value) !== 0 // React unitless == px
  const stripped = value.replace(/var\(\s*--r-[\w-]*\s*(?:,[^)]*)?\)/g, ' ')
  const tokens = stripped.trim().split(/\s+/).filter(Boolean)
  return tokens.some(
    (tok) => /^\d+(?:\.\d+)?(?:px|rem|%)?$/.test(tok) && !/^0(?:\.0+)?(?:px|rem|%)?$/.test(tok)
  )
}

function restOfLine(text, afterIdx) {
  const nl = text.indexOf('\n', afterIdx)
  return text.slice(afterIdx, nl === -1 ? text.length : nl)
}

function detectHexColor(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(HEX_COLOR_RE)) {
    out.push(makeViolation('source-single', 'g1-hex', rootDir, filePath, text, m.index, m[0].length))
  }
  return out
}

function detectColorFn(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(COLOR_FN_RE)) {
    out.push(
      makeViolation('source-single', 'g1-colorfn', rootDir, filePath, text, m.index, m[0].length)
    )
  }
  return out
}

function detectCubicBezierPresence(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(CUBIC_BEZIER_CALL_RE)) {
    out.push(
      makeViolation('source-single', 'g1-cubic-bezier', rootDir, filePath, text, m.index, m[0].length)
    )
  }
  return out
}

function detectRadius(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(RADIUS_CSS_RE)) {
    if (isOffendingRadiusValue(m[1])) {
      out.push(makeViolation('source-single', 'g1-radius', rootDir, filePath, text, m.index, m[0].length))
    }
  }
  for (const m of text.matchAll(RADIUS_JS_KEY_RE)) {
    const afterIdx = m.index + m[0].length
    let region = restOfLine(text, afterIdx)
    const stop = /[,}]/.exec(region)
    if (stop) region = region.slice(0, stop.index)
    if (isOffendingRadiusValue(region)) {
      out.push(
        makeViolation(
          'source-single',
          'g1-radius',
          rootDir,
          filePath,
          text,
          m.index,
          m[0].length + region.length
        )
      )
    }
  }
  return out
}

function detectDurationLiteral(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(DURATION_PROP_RE)) {
    const afterIdx = m.index + m[0].length
    const region = restOfLine(text, afterIdx)
    const stripped = region.replace(/var\(\s*--motion-[\w-]*\s*\)/g, (s) => ' '.repeat(s.length))
    const litMatch = /\d+(?:\.\d+)?(?:ms|s)\b/.exec(stripped)
    if (litMatch) {
      const anchor = afterIdx + litMatch.index
      out.push(
        makeViolation('source-single', 'g1-duration', rootDir, filePath, text, anchor, litMatch[0].length)
      )
    }
  }
  return out
}

export function scanSourceSingle(files, rootDir) {
  const out = []
  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8')
    out.push(
      ...detectHexColor(rootDir, filePath, text),
      ...detectColorFn(rootDir, filePath, text),
      ...detectRadius(rootDir, filePath, text),
      ...detectCubicBezierPresence(rootDir, filePath, text),
      ...detectDurationLiteral(rootDir, filePath, text)
    )
  }
  return out
}

// ════════════════════════════════════════════════════════════════
// Gate 2 · 避讳·字面 (taboo)
// ════════════════════════════════════════════════════════════════

const GRADIENT_RE = /(?:linear|radial|conic)-gradient\(/g
const BG_CLIP_TEXT_CSS_RE = /(?:-webkit-)?background-clip\s*:\s*text\b/g
const BG_CLIP_TEXT_JS_RE = /(?:WebkitBackgroundClip|backgroundClip)\s*:\s*(['"`])text\1/g
const BACKDROP_FILTER_CSS_RE = /(?:-webkit-)?backdrop-filter\s*:\s*([^;}]+)(?=[;}])/g
const BACKDROP_FILTER_JS_KEY_RE = /(?:WebkitBackdropFilter|backdropFilter)\s*:\s*/g
const ALLOWED_BACKDROP_VALUE = 'var(--surface-chrome-blur)'
const KEYFRAMES_NAME_RE = /@keyframes\s+([\w-]+)/g
const ANIMATION_NAME_RE = /\banimation(?:-name|Name)?\s*:\s*/g
const TRANSITION_PROP_KEY_RE = /\btransition(?:-property)?\s*:\s*/g
const BANNED_LAYOUT_PROP_RE =
  /^(?:width|height|top|left|right|bottom|max-height|maxHeight|margin[\w-]*|padding[\w-]*)$/i
const TABOO_WORDS_RE = /超强|赋能|极致|世界级|一键智能|魔法|✨|Supercharge|Empower|World-class/gi

function unwrapQuotes(s) {
  const m = /^\s*(['"`])([\s\S]*)\1\s*$/.exec(s)
  return m ? m[2] : s
}

function detectGradient(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(GRADIENT_RE)) {
    out.push(makeViolation('taboo', 'g2-gradient', rootDir, filePath, text, m.index, m[0].length))
  }
  return out
}

function detectBgClipText(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(BG_CLIP_TEXT_CSS_RE)) {
    out.push(makeViolation('taboo', 'g2-bgcliptext', rootDir, filePath, text, m.index, m[0].length))
  }
  for (const m of text.matchAll(BG_CLIP_TEXT_JS_RE)) {
    out.push(makeViolation('taboo', 'g2-bgcliptext', rootDir, filePath, text, m.index, m[0].length))
  }
  return out
}

function detectBackdropFilter(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(BACKDROP_FILTER_CSS_RE)) {
    if (m[1].trim() !== ALLOWED_BACKDROP_VALUE) {
      out.push(
        makeViolation('taboo', 'g2-backdropfilter', rootDir, filePath, text, m.index, m[0].length)
      )
    }
  }
  for (const m of text.matchAll(BACKDROP_FILTER_JS_KEY_RE)) {
    const afterIdx = m.index + m[0].length
    let region = restOfLine(text, afterIdx)
    const stop = /[,}]/.exec(region)
    if (stop) region = region.slice(0, stop.index)
    if (unwrapQuotes(region).trim() !== ALLOWED_BACKDROP_VALUE) {
      out.push(
        makeViolation(
          'taboo',
          'g2-backdropfilter',
          rootDir,
          filePath,
          text,
          m.index,
          m[0].length + region.length
        )
      )
    }
  }
  return out
}

function detectOvershootCubicBezier(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(CUBIC_BEZIER_CALL_RE)) {
    const nums = [m[1], m[2], m[3], m[4]].map(Number)
    if (nums.some((n) => n < 0 || n > 1)) {
      out.push(
        makeViolation(
          'taboo',
          'g2-overshoot-cubicbezier',
          rootDir,
          filePath,
          text,
          m.index,
          m[0].length
        )
      )
    }
  }
  return out
}

function detectBounceElasticName(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(KEYFRAMES_NAME_RE)) {
    if (/bounce|elastic/i.test(m[1])) {
      out.push(
        makeViolation('taboo', 'g2-bounce-elastic-name', rootDir, filePath, text, m.index, m[0].length)
      )
    }
  }
  for (const m of text.matchAll(ANIMATION_NAME_RE)) {
    const afterIdx = m.index + m[0].length
    let region = restOfLine(text, afterIdx)
    const stop = /[,}]/.exec(region)
    if (stop) region = region.slice(0, stop.index)
    const firstToken = unwrapQuotes(region).trim().split(/\s+/)[0] || ''
    if (/bounce|elastic/i.test(firstToken)) {
      out.push(
        makeViolation(
          'taboo',
          'g2-bounce-elastic-name',
          rootDir,
          filePath,
          text,
          m.index,
          m[0].length + firstToken.length
        )
      )
    }
  }
  return out
}

function segmentsOf(regionText) {
  // CSS-style plain value (no quotes) -> the region itself is the value.
  // JS-style -> pull out every quoted alternative (handles ternaries).
  if (!/['"`]/.test(regionText)) return [regionText]
  const values = []
  const re = /(['"`])((?:(?!\1)[\s\S])*)\1/g
  let m
  while ((m = re.exec(regionText))) values.push(m[2])
  return values.length ? values : [regionText]
}

function detectLayoutAnimation(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(TRANSITION_PROP_KEY_RE)) {
    const afterIdx = m.index + m[0].length
    const region = restOfLine(text, afterIdx)
    const values = segmentsOf(region)
    let flagged = false
    for (const value of values) {
      for (const seg of value.split(',')) {
        const prop = seg.trim().split(/\s+/)[0] || ''
        if (BANNED_LAYOUT_PROP_RE.test(prop)) {
          flagged = true
          break
        }
      }
      if (flagged) break
    }
    if (flagged) {
      out.push(
        makeViolation(
          'taboo',
          'g2-layout-animation',
          rootDir,
          filePath,
          text,
          m.index,
          m[0].length + Math.min(region.length, 80)
        )
      )
    }
  }
  return out
}

function detectCopyTaboo(rootDir, filePath, text) {
  const out = []
  for (const m of text.matchAll(TABOO_WORDS_RE)) {
    out.push(makeViolation('taboo', 'g2-copy-taboo', rootDir, filePath, text, m.index, m[0].length))
  }
  return out
}

const STRINGS_DIR_RE = /(^|\/)lib\/strings\//

export function scanTaboo(files, rootDir) {
  const out = []
  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8')
    out.push(
      ...detectGradient(rootDir, filePath, text),
      ...detectBgClipText(rootDir, filePath, text),
      ...detectBackdropFilter(rootDir, filePath, text),
      ...detectOvershootCubicBezier(rootDir, filePath, text),
      ...detectBounceElasticName(rootDir, filePath, text),
      ...detectLayoutAnimation(rootDir, filePath, text)
    )
    if (STRINGS_DIR_RE.test(toPosixRel(rootDir, filePath))) {
      out.push(...detectCopyTaboo(rootDir, filePath, text))
    }
  }
  return out
}

// ════════════════════════════════════════════════════════════════
// Gate 3 · 对校·对比度 (contrast)
// ════════════════════════════════════════════════════════════════

const REQUIRED_PAIRS = [
  ['ink', 'bg'],
  ['ink', 'bg-card'],
  ['ink-2', 'bg'],
  ['ink-2', 'bg-card'],
  ['ink-2', 'bg-raised'],
  ['ink-3', 'bg'],
  ['ink-3', 'bg-card'],
  ['accent', 'bg'],
  ['accent', 'bg-card'],
  ['danger', 'bg'],
  ['good', 'bg'],
  ['warn', 'bg-card'],
  ['danger', 'danger-soft'],
  ['good', 'good-soft'],
  ['warn', 'warn-soft'],
  ['rate-hard', 'rate-hard-soft'],
  ['teal', 'teal-soft'],
  ['accent', 'accent-soft'],
  ['bg-card', 'ink'], // 墨底纸字 primary button
]

const INFO_PAIRS = [
  ['ink-4', 'bg'],
  ['border-strong', 'bg'],
]

const REQUIRED_RATIO = 4.5
const INFO_RATIO = 3.0

function extractRootBlock(cssText, selectorRe) {
  const m = selectorRe.exec(cssText)
  if (!m) return null
  const braceStart = cssText.indexOf('{', m.index)
  if (braceStart === -1) return null
  const braceEnd = cssText.indexOf('}', braceStart)
  if (braceEnd === -1) return null
  return cssText.slice(braceStart + 1, braceEnd)
}

/** Parse `:root` and `:root.dark` custom properties into {light, dark} token maps. */
export function parseTokens(cssText) {
  const lightBlock = extractRootBlock(cssText, /:root\s*\{/g)
  const darkBlock = extractRootBlock(cssText, /:root\.dark\s*\{/g)
  const parseBlock = (block) => {
    const map = new Map()
    if (!block) return map
    for (const m of block.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
      const name = m[1]
      const resolved = parseColorToken(m[2].trim())
      map.set(name, resolved) // null = derived/unsupported, intentionally kept (reported as skip)
    }
    return map
  }
  return { light: parseBlock(lightBlock), dark: parseBlock(darkBlock) }
}

function evaluatePairs(themeMap, pairs, required) {
  const rows = []
  for (const [fg, bg] of pairs) {
    const fgColor = themeMap.get(fg)
    const bgColor = themeMap.get(bg)
    if (!fgColor || !bgColor) {
      rows.push({ fg, bg, ratio: null, required, status: 'SKIP', outOfGamut: false })
      continue
    }
    const ratio = contrastRatio(fgColor, bgColor)
    rows.push({
      fg,
      bg,
      ratio,
      required,
      status: ratio >= required ? 'PASS' : 'FAIL',
      outOfGamut: Boolean(fgColor.outOfGamut || bgColor.outOfGamut),
    })
  }
  return rows
}

function evaluateTheme(themeMap) {
  const required = evaluatePairs(themeMap, REQUIRED_PAIRS, REQUIRED_RATIO)
  const info = evaluatePairs(themeMap, INFO_PAIRS, INFO_RATIO).map((r) => ({
    ...r,
    status: r.status === 'SKIP' ? 'SKIP' : 'INFO',
  }))
  return [...required, ...info]
}

function gitShortHash(cwd) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function renderTableSection(themeName, rows) {
  const lines = [
    `## ${themeName}`,
    '',
    '| pair | ratio | required | status |',
    '| --- | ---: | ---: | :---: |',
  ]
  for (const row of rows) {
    const pair = `${row.fg} / ${row.bg}`
    const ratio = row.ratio == null ? '—' : row.ratio.toFixed(2)
    const gamutMark = row.outOfGamut ? ' ⚠' : ''
    lines.push(`| ${pair} | ${ratio}${gamutMark} | ${row.required.toFixed(1)} | ${row.status} |`)
  }
  return lines.join('\n')
}

/**
 * Run gate 3 against a tokens.css-shaped file. Returns per-theme rows plus
 * the list of required-pairs that FAIL (for baseline reconciliation) and any
 * out-of-gamut notes. Writing docs/contrast-table.md is the caller's job
 * (main() does it for the real tokens.css; --self-test does not).
 */
export function runContrastGate(tokensPath) {
  const cssText = readFileSync(tokensPath, 'utf8')
  const { light, dark } = parseTokens(cssText)
  const lightRows = evaluateTheme(light)
  const darkRows = evaluateTheme(dark)

  const violations = []
  for (const [themeName, rows] of [
    ['light', lightRows],
    ['dark', darkRows],
  ]) {
    for (const row of rows) {
      if (row.status === 'FAIL') {
        violations.push({
          gate: 'contrast',
          id: 'g3-contrast-fail',
          file: 'styles/tokens.css',
          line: 0,
          match: `${themeName}:${row.fg}/${row.bg}`,
          ratio: row.ratio,
          required: row.required,
        })
      }
    }
  }

  const outOfGamutNotes = []
  for (const [themeName, rows] of [
    ['light', lightRows],
    ['dark', darkRows],
  ]) {
    for (const row of rows) {
      if (row.outOfGamut) outOfGamutNotes.push(`${themeName}: ${row.fg}/${row.bg}`)
    }
  }

  return { lightRows, darkRows, violations, outOfGamutNotes, cssText }
}

export function renderContrastTable(tokensPath, gateResult, { root = ROOT } = {}) {
  const hash = gitShortHash(root)
  const date = new Date().toISOString().slice(0, 10)
  const sha1 = createHash('sha1').update(gateResult.cssText).digest('hex')
  const header = [
    '# 对比度实测表',
    '',
    `> 牌记 — generated by \`scripts/collate/collate.mjs\` · commit \`${hash}\` · ${date} · tokens.css sha1 \`${sha1}\``,
    '>',
    '> 影刻件，非底本；随色板改动重生成。据 `docs/design-kanli.md` §九、`docs/design-collation.md` 记-03。' +
      ' PASS/FAIL 对 required 之 4.5:1（WCAG AA，正文级）；INFO 对 3.0:1，仅存记不判是非。SKIP 表示某侧 token 未解析（derived/color-mix，非本门管辖）。',
    '',
  ]
  if (gateResult.outOfGamutNotes.length) {
    header.push(
      `> ⚠ out-of-gamut（sRGB 编码超出 [0,1] 逾 1%，已截取）：${gateResult.outOfGamutNotes.join('；')}`,
      ''
    )
  }
  const body = [
    renderTableSection('light', gateResult.lightRows),
    '',
    renderTableSection('dark', gateResult.darkRows),
    '',
  ]
  return [...header, ...body].join('\n')
}

// ════════════════════════════════════════════════════════════════
// Gate 4 · 牌记完整 (paiji, static check)
// ════════════════════════════════════════════════════════════════

export function runColophonGate({ viteConfigPath = VITE_CONFIG_PATH, srcDir = SRC_DIR } = {}) {
  let viteHasDefine = false
  if (existsSync(viteConfigPath)) {
    const viteText = readFileSync(viteConfigPath, 'utf8')
    viteHasDefine = /\bdefine\s*:\s*\{/.test(viteText) && /__MNEMOS_BUILD__\s*:/.test(viteText)
  }

  let srcReferences = false
  for (const filePath of scanRootFiles(srcDir)) {
    if (extname(filePath) !== '.js' && extname(filePath) !== '.jsx') continue
    const text = readFileSync(filePath, 'utf8')
    if (text.includes('__MNEMOS_BUILD__')) {
      srcReferences = true
      break
    }
  }

  const ok = viteHasDefine && srcReferences
  const violations = ok
    ? []
    : [
        {
          gate: 'paiji',
          id: 'g4-colophon',
          file: 'vite.config.js',
          line: 0,
          match: `__MNEMOS_BUILD__ pending (define=${viteHasDefine}, src-ref=${srcReferences})`,
        },
      ]
  return { ok, viteHasDefine, srcReferences, violations }
}

// ════════════════════════════════════════════════════════════════
// Baseline reconciliation (shrink-only)
// ════════════════════════════════════════════════════════════════

export function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return []
  const raw = readFileSync(BASELINE_PATH, 'utf8').trim()
  if (!raw) return []
  return JSON.parse(raw)
}

function baselineEntryMatches(entry, violation) {
  if (entry.gate !== violation.gate) return false
  if (entry.file != null && entry.file !== violation.file) return false
  if (entry.match != null && !violation.match.includes(entry.match)) return false
  return true
}

/**
 * Cross-reference every violation against the baseline. Returns:
 *   - warned: violations covered by a baseline entry (登记缺口, non-fatal)
 *   - failed: violations NOT covered by any baseline entry
 *   - staleEntries: baseline entries that matched nothing (shrink-only violation)
 */
export function reconcile(violations, baseline) {
  const used = new Set()
  const warned = []
  const failed = []
  for (const v of violations) {
    const idx = baseline.findIndex((entry, i) => !used.has(i) && baselineEntryMatches(entry, v))
    if (idx === -1) {
      failed.push(v)
    } else {
      used.add(idx)
      warned.push({ ...v, baselineEntry: baseline[idx] })
    }
  }
  const staleEntries = baseline.filter((_, i) => !used.has(i))
  return { warned, failed, staleEntries }
}

// ════════════════════════════════════════════════════════════════
// Self-test (阴性对照, 刊例第四十三条)
// ════════════════════════════════════════════════════════════════

const ALL_DETECTOR_IDS = [
  'g1-hex',
  'g1-colorfn',
  'g1-radius',
  'g1-cubic-bezier',
  'g1-duration',
  'g2-gradient',
  'g2-bgcliptext',
  'g2-backdropfilter',
  'g2-overshoot-cubicbezier',
  'g2-bounce-elastic-name',
  'g2-layout-animation',
  'g2-copy-taboo',
  'g3-contrast-fail',
]

// Gate 4 (paiji) is intentionally excluded from self-test: it is a
// structural check across two fixed real-repo files (vite.config.js +
// "some file under src/"), not a fixture-scannable pattern detector. It is
// exercised for real, against the real repo, on every normal run instead.

export function runSelfTest() {
  const files = scanRootFiles(FIXTURES_DIR)
  const sourceSingle = scanSourceSingle(files, FIXTURES_DIR)
  const taboo = scanTaboo(files, FIXTURES_DIR)

  const fired = new Set([...sourceSingle, ...taboo].map((v) => v.id))

  const contrastFixture = join(FIXTURES_DIR, 'tokens.contrast-fail.css')
  if (existsSync(contrastFixture)) {
    const { violations } = runContrastGate(contrastFixture)
    if (violations.some((v) => v.id === 'g3-contrast-fail')) fired.add('g3-contrast-fail')
  }

  const missing = ALL_DETECTOR_IDS.filter((id) => !fired.has(id))
  return { fired, missing, violationCount: sourceSingle.length + taboo.length }
}

// ════════════════════════════════════════════════════════════════
// main
// ════════════════════════════════════════════════════════════════

function printReport(title, violations, baseline) {
  const { warned, failed } = reconcile(violations, baseline)
  console.log(`\n${title}: ${violations.length} hit(s) — ${warned.length} WARN (baseline), ${failed.length} FAIL`)
  for (const f of failed) {
    console.log(`  FAIL  ${f.file}:${f.line}  [${f.id}]  ${f.match}`)
  }
  return { warned, failed }
}

function main() {
  const args = process.argv.slice(2)
  const selfTest = args.includes('--self-test')

  if (selfTest) {
    const { fired, missing, violationCount } = runSelfTest()
    console.log(`死校 --self-test: ${fired.size}/${ALL_DETECTOR_IDS.length} detectors fired (${violationCount} raw hits against fixtures/)`)
    if (missing.length) {
      console.log(`FAIL — silent detector(s): ${missing.join(', ')}`)
      process.exit(1)
    }
    console.log('PASS — every detector fired at least once against scripts/collate/fixtures/.')
    process.exit(0)
    return
  }

  const baseline = loadBaseline()
  const allFailed = []
  const allWarned = []

  const files = scanRootFiles(SRC_DIR, { excludeRelPaths: ['styles/tokens.css'] })

  const g1 = scanSourceSingle(files, SRC_DIR)
  const r1 = printReport('Gate 1 · 对校·底本单源', g1, baseline)
  allFailed.push(...r1.failed)
  allWarned.push(...r1.warned)

  const g2 = scanTaboo(files, SRC_DIR)
  const r2 = printReport('Gate 2 · 避讳·字面', g2, baseline)
  allFailed.push(...r2.failed)
  allWarned.push(...r2.warned)

  const contrastResult = runContrastGate(TOKENS_PATH)
  const r3 = printReport('Gate 3 · 对校·对比度', contrastResult.violations, baseline)
  allFailed.push(...r3.failed)
  allWarned.push(...r3.warned)
  writeFileSync(CONTRAST_TABLE_PATH, renderContrastTable(TOKENS_PATH, contrastResult))
  console.log(`  → wrote ${toPosixRel(ROOT, CONTRAST_TABLE_PATH)}`)
  if (contrastResult.outOfGamutNotes.length) {
    console.log(`  ⚠ out-of-gamut: ${contrastResult.outOfGamutNotes.join('; ')}`)
  }

  const colophon = runColophonGate({ viteConfigPath: VITE_CONFIG_PATH, srcDir: SRC_DIR })
  const r4 = printReport('Gate 4 · 牌记完整', colophon.violations, baseline)
  allFailed.push(...r4.failed)
  allWarned.push(...r4.warned)

  // Baseline staleness is checked once, globally, across all four gates'
  // violations combined (an entry might reference any gate).
  const allViolations = [...g1, ...g2, ...contrastResult.violations, ...colophon.violations]
  const staleEntries = reconcile(allViolations, baseline).staleEntries

  console.log(`\nBaseline: ${baseline.length} entr(y/ies), ${allWarned.length} WARN matched, ${staleEntries.length} stale`)
  for (const entry of staleEntries) {
    console.log(`  FAIL  baseline stale — remove entry: ${JSON.stringify(entry)}`)
  }

  const exitCode = allFailed.length > 0 || staleEntries.length > 0 ? 1 : 0
  console.log(`\n死校 collate: exit ${exitCode}`)
  process.exit(exitCode)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
