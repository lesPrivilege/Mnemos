/**
 * scripts/subset-ui-font.mjs
 *
 * 牌记 — 朱雀仿宋（器轨）子集生成管线。产出 src/styles/fonts/zhuque-fangsong-ui.woff2，
 * 由 src/styles/fonts.css 的 @font-face 消费。见 docs/design-kanli.md §字轨四声、
 * docs/design-collation.md 记-07。
 *
 * Source: TrionesType/zhuque (the project formerly known as TypeIsBeautiful/zhuque —
 * the GitHub org was renamed; TypeIsBeautiful/zhuque now 404s, TrionesType/zhuque is
 * the live repo, license OFL-1.1 confirmed via both the GitHub API license field and
 * the vendored LICENSE.txt text). Release asset is fetched on demand from a pinned
 * URL and sha256-verified — the full unhinted TTF is ~8.8MB unsubsetted and is
 * deliberately NOT vendored in this repo; only the generated woff2 subset is
 * committed, so the build never depends on the network.
 *
 * Charset = union of:
 *   1. every character appearing in src/lib/strings/**\/*.js string literals
 *      (the actual, closed set of chrome text this app ever renders — 器轨 only
 *      typesets app-authored strings, per design-kanli.md)
 *   2. ASCII printable
 *   3. CJK punctuation （），。·—…「」《》？！：；、
 *   4. digits
 *   5. a fixed set of characters used dynamically (date/count formatting etc.)
 *      that may not appear literally in a string-literal scan
 *   6. a ~1000-character safety margin of common CJK characters, so small future
 *      copy edits don't immediately need a re-subset — see SAFETY_MARGIN_1000 below
 *      for provenance.
 *
 * Usage: `npm run subset:font` (re-run any time src/lib/strings/ changes).
 * Idempotent: same source font + same charset -> byte-identical woff2.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateRawSync } from 'node:zlib'
import subsetFont from 'subset-font'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '..')

// ─────── pinned source ───────
// Latest release as of this writing (see docs/design-kanli.md §字轨四声).
// Zhuque Fangsong has shipped every release as a "technical preview" since
// project inception (single weight, pre-1.0) — that is the project's normal
// release channel, not an unusual beta; design-kanli.md already accounts for
// this ("单字重", OFL). Bump these three constants together when adopting a
// newer release, and re-verify the family name below against the new TTF's
// name table (`node scripts/subset-ui-font.mjs --print-name-table`).
const FONT_VERSION = '0.212'
const RELEASE_ASSET_URL = `https://github.com/TrionesType/zhuque/releases/download/v${FONT_VERSION}/ZhuqueFangsong-v${FONT_VERSION}.zip`
const RELEASE_ASSET_SHA256 = 'bb8b661a7643d2296a72d9d10530a00949419c4e527fb61783f73c2ba1a8c062'
const TTF_ENTRY_NAME = 'ZhuqueFangsong-Regular.ttf'

// Verified from the TTF's own `name` table (platform 3 / Windows, encoding 1,
// language 1033 en-US), nameID 1 (Font Family name) and nameID 16 (Typographic
// Family name) — not guessed from the filename or the npm package name. Must
// match the `font-family` in src/styles/fonts.css's @font-face exactly.
const EXPECTED_FONT_FAMILY_NAME = 'Zhuque Fangsong (technical preview)'

const OUTPUT_WOFF2 = path.join(REPO_ROOT, 'src/styles/fonts/zhuque-fangsong-ui.woff2')
const STRINGS_DIR = path.join(REPO_ROOT, 'src/lib/strings')
const CACHE_DIR = path.join(tmpdir(), 'mnemos-font-cache', 'zhuque-fangsong', FONT_VERSION)

// ─────── charset: fixed unions ───────

let ASCII_PRINTABLE = ''
for (let cp = 0x20; cp <= 0x7e; cp++) ASCII_PRINTABLE += String.fromCharCode(cp)

const DIGITS = '0123456789'

const CJK_PUNCTUATION = '（），。·—…「」《》？！：；、'

// 张条卡题日周一二三四五六天年月分秒 — dynamic/composed UI text (dates, counts,
// weekday labels) that may not appear literally inside a string-literal scan.
const EXPLICIT_CHARS = '张条卡题日周一二三四五六天年月分秒'

// ─────── charset: ~1000-character safety margin ───────
//
// Provenance (documented per task spec, not guessed): derived from the jieba
// project's word-frequency corpus, dict.txt, pinned at tag v0.42.1
// (https://raw.githubusercontent.com/fxsjy/jieba/v0.42.1/jieba/dict.txt).
// Method:
//   1. Extract every single-CJK-character entry (U+4E00-U+9FFF) and sum its
//      frequency across duplicate POS-tagged lines.
//   2. Rank all ~11.6k distinct single characters by total frequency, descending.
//   3. Cross-check filter: drop any candidate that never occurs as a substring
//      of any >=2-character dictionary entry. This step was load-bearing, not
//      precautionary — dict.txt's raw top-1000-by-frequency is contaminated by
//      GBK/UTF-8 round-trip mojibake (encoding-corrupted pseudo-characters that
//      accumulate high counts as isolated "words" but never combine into real
//      compounds). It caught and removed 12: 锛 紝 銆 殑 鐨 屽 鏄 槸 杩 簡 竴 屾.
//   4. Take the top 1000 surviving characters.
// Regeneration is not wired into this script (it needs the ~350k-line corpus
// file, not worth vendoring for a safety-margin list) — this is the frozen
// result, embedded directly.
const SAFETY_MARGIN_1000 =
  '了是在和有他不我的人也为就这上年中你说一到都等着对来与地还要又大而之道以得她个后去将那但从月下把被于时只多过可并能好会出或日由里用所向已其给很看使前新想却它最见起小高更如再才便没走做让内及听成各事号至叫两当三本无此们家长市门正同吃天比米外即分问话打老自副跟笑则像较国死省住万因曾元呢手达头作该女开路约军称名二每属谁受带进先应吧县心占处区太点水南张今间总回山请者党段法连站第共另生全行倒快派啊相吗经按找口均种字入真拿城马干王据四子书仍难西东少次些钱北气近杀清学强写既若往台原发任美未杨兵非除边位鱼明设州直定越身重声五低坐儿极放金红朝爱知主您报类早虽面别初性型讲部送远反指乡方甚完常意队涓式左拉花电条剑神动湖河白官师仅教哪变图平府热制望岁转建命加管场跑穿众么黑怕风信置急石黄镇取光竟力数曰亲传深脸买接茶且办待文提系量忙尽喝郡车啦刚级背离故言海体座酒通满呀李令飞流德足瞧合右罢亦改刀破龙需宽必病随须居呈汉群算战眼安靠藏落项首掌街铁物林土菜现率火桥股象古跳某惊搞药冲双六情鄂掉立乱周几承村收半供九活敢余获兼十特船顶断似毛调吴形线忽七久史辖英卖血画轻皆治权哭空记男八喜论伤架归退游实差姓朱网皮刺睡选科关化浜骂底院含洞机色阿装理驻产铺领块怎封谈诸觉团肉期岛代短旧嘴挂留民敌京诗愿墓世举殿帮抓换件求脚房宫云食错牛拜饭推状复句克救楼胜具斗层集著片奔章届木怪江抱职拍交表降田营修考员银欲何停界解草剉紫刘善香单晚吨亚抢弄列质铜词厂暖感凭追紧题臣油读球守俄功端散义公攻陈礼青引投目树寺岗墙颇尚凡邦根末枪运值港响势鬼批包替司卷旁夏招武冒族贴硬利坛冷玉腿答保照假板御易贼妈度宋专熟计忘赴射页乃垸巴咱支厚烧微虎布节升依苦绝翻逃唐春闻奇略甲楚喊份班广怒孙绣版坏组叶轮哥决浠压弹显语室业摸庙稍素扑赶迎宝果贵炒闹抬雨齐骑盐卒星哩客摆借折负击戴细呆奉观唱华毒泥味渐始横亮套兴步仙雪倍汗耳格忌核纵器藕遂玩练罪盖距寨吓乘厅叹恨祭诏僭斯吹虚汤够讯姊夫弦环精户挥爬岂奏持亿夜源围局圣懂存秒念娘骨插献境密竹僧酸烟超苏蛋隔商排堂盘皇争圆偏顾狗尔鸡湘脱撞工结帝篇挺犯波告罗软千纸试然梦松辽旗绿痛准乐志失害陪啥致基证躲确逼丁政烤舰炮社钟咬糖劝宜腰灭箭侧寻躺襄角恩哦跪遇澶谷猛印异拖粮韩查嘛灯抗伸店阳阵兄帐编智沿操载暗灵百遭移砍郭养胡呼般托宗衣仗艘盛补幺吾笔费柄瓦败弟拱岭毕床洗止饮牌爹劲碗爷魔君孔恶洲奖术涔棣哼夺猪搭扶脉赵联佛穴虫莫价造登增戏鸟歌绕毁蒙'

// ─────── src/lib/strings/**/*.js -> literal character set ───────

function walkJsFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkJsFiles(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full)
  }
  return out
}

/**
 * Minimal string/template-literal content extractor. Not a full JS parser —
 * good enough for src/lib/strings/, which is plain string-constant objects
 * (verified by hand). Skips // and /* comments so stray punctuation in prose
 * comments can't leak in; strips `${...}` interpolation (tracking brace
 * depth) since that's code, not literal chrome text.
 */
function extractStringLiterals(source) {
  const literals = []
  let i = 0
  const n = source.length
  while (i < n) {
    const c = source[i]
    const c2 = source[i + 1]
    if (c === '/' && c2 === '/') {
      i += 2
      while (i < n && source[i] !== '\n') i++
      continue
    }
    if (c === '/' && c2 === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++
      i += 2
      continue
    }
    if (c === "'" || c === '"') {
      const quote = c
      let j = i + 1
      let buf = ''
      while (j < n && source[j] !== quote) {
        if (source[j] === '\\') {
          buf += source[j + 1] ?? ''
          j += 2
        } else {
          buf += source[j]
          j += 1
        }
      }
      literals.push(buf)
      i = j + 1
      continue
    }
    if (c === '`') {
      let j = i + 1
      let buf = ''
      while (j < n && source[j] !== '`') {
        if (source[j] === '\\') {
          buf += source[j + 1] ?? ''
          j += 2
        } else if (source[j] === '$' && source[j + 1] === '{') {
          let depth = 1
          j += 2
          while (j < n && depth > 0) {
            if (source[j] === '{') depth++
            else if (source[j] === '}') depth--
            j += 1
          }
        } else {
          buf += source[j]
          j += 1
        }
      }
      literals.push(buf)
      i = j + 1
      continue
    }
    i += 1
  }
  return literals
}

function buildCharset() {
  const stringsChars = new Set()
  const files = walkJsFiles(STRINGS_DIR)
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const literal of extractStringLiterals(source)) {
      for (const ch of literal) stringsChars.add(ch)
    }
  }

  const all = new Set(stringsChars)
  for (const ch of ASCII_PRINTABLE) all.add(ch)
  for (const ch of CJK_PUNCTUATION) all.add(ch)
  for (const ch of DIGITS) all.add(ch)
  for (const ch of EXPLICIT_CHARS) all.add(ch)
  for (const ch of SAFETY_MARGIN_1000) all.add(ch)

  return { all, stringsChars, fileCount: files.length }
}

// ─────── dependency-free zip reader (single-entry release asset) ───────

function extractZipEntry(zipBuffer, entryName) {
  const EOCD_SIG = 0x06054b50
  let eocdOffset = -1
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) throw new Error('extractZipEntry: End Of Central Directory not found')

  const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16)
  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10)

  let off = centralDirOffset
  for (let i = 0; i < entryCount; i++) {
    if (zipBuffer.readUInt32LE(off) !== 0x02014b50) {
      throw new Error(`extractZipEntry: bad central directory signature at ${off}`)
    }
    const method = zipBuffer.readUInt16LE(off + 10)
    const compSize = zipBuffer.readUInt32LE(off + 20)
    const uncompSize = zipBuffer.readUInt32LE(off + 24)
    const nameLen = zipBuffer.readUInt16LE(off + 28)
    const extraLen = zipBuffer.readUInt16LE(off + 30)
    const commentLen = zipBuffer.readUInt16LE(off + 32)
    const localHeaderOffset = zipBuffer.readUInt32LE(off + 42)
    const name = zipBuffer.toString('utf8', off + 46, off + 46 + nameLen)

    if (name === entryName) {
      if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error(`extractZipEntry: bad local file header for ${name}`)
      }
      const lhNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26)
      const lhExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + lhNameLen + lhExtraLen
      const compressed = zipBuffer.subarray(dataStart, dataStart + compSize)
      const data = method === 0 ? compressed : inflateRawSync(compressed)
      if (data.length !== uncompSize) {
        throw new Error(`extractZipEntry: size mismatch for ${name}`)
      }
      return data
    }
    off += 46 + nameLen + extraLen + commentLen
  }
  throw new Error(`extractZipEntry: entry "${entryName}" not found in zip`)
}

function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

// Shells out to curl rather than using Node's built-in fetch(): curl honors
// HTTP_PROXY/HTTPS_PROXY the way every standard CLI tool does, while Node's
// undici-based fetch() does not follow those env vars without extra
// ProxyAgent wiring — it silently hangs on networks that require the proxy
// (discovered exactly that way while building this script). This is a
// build/CI-time-only script (never shipped), and vite.config.js already
// shells out to `git` for the same reason: reach for the OS tool that
// already does the right thing instead of re-implementing it.
function downloadWithCurl(url, destPath) {
  execFileSync(
    'curl',
    ['-sL', '--fail', '--connect-timeout', '20', '--max-time', '120', '-o', destPath, url],
    { stdio: 'inherit' }
  )
}

async function ensureSourceFont() {
  mkdirSync(CACHE_DIR, { recursive: true })
  const zipPath = path.join(CACHE_DIR, `ZhuqueFangsong-v${FONT_VERSION}.zip`)
  const ttfPath = path.join(CACHE_DIR, TTF_ENTRY_NAME)

  if (existsSync(ttfPath)) {
    return readFileSync(ttfPath)
  }

  let zipBuffer
  if (existsSync(zipPath) && sha256(readFileSync(zipPath)) === RELEASE_ASSET_SHA256) {
    zipBuffer = readFileSync(zipPath)
  } else {
    console.log(`[subset-ui-font] fetching ${RELEASE_ASSET_URL}`)
    try {
      downloadWithCurl(RELEASE_ASSET_URL, zipPath)
    } catch (err) {
      throw new Error(
        `download failed via curl: ${err.message}\n` +
          `If curl is unavailable in this environment, manually download ${RELEASE_ASSET_URL} ` +
          `to ${zipPath} and re-run.`,
        { cause: err }
      )
    }
    zipBuffer = readFileSync(zipPath)
    const actualHash = sha256(zipBuffer)
    if (actualHash !== RELEASE_ASSET_SHA256) {
      unlinkSync(zipPath) // don't poison the cache with an unverified file
      throw new Error(
        `sha256 mismatch for ${RELEASE_ASSET_URL}\n` +
          `  expected: ${RELEASE_ASSET_SHA256}\n` +
          `  actual:   ${actualHash}\n` +
          'Refusing to subset an unverified font binary.'
      )
    }
  }

  const ttfBuffer = extractZipEntry(zipBuffer, TTF_ENTRY_NAME)
  writeFileSync(ttfPath, ttfBuffer)
  return ttfBuffer
}

// ─────── SFNT name-table check (family-name safety net) ───────

function readEnglishFamilyName(ttfBuffer) {
  const u16 = (off) => ttfBuffer.readUInt16BE(off)
  const u32 = (off) => ttfBuffer.readUInt32BE(off)
  const numTables = u16(4)
  let nameTableOffset = null
  for (let i = 0; i < numTables; i++) {
    const recOff = 12 + i * 16
    if (ttfBuffer.toString('ascii', recOff, recOff + 4) === 'name') {
      nameTableOffset = u32(recOff + 8)
    }
  }
  if (nameTableOffset == null) throw new Error('readEnglishFamilyName: no name table')

  const count = u16(nameTableOffset + 2)
  const stringOffset = u16(nameTableOffset + 4)
  for (let i = 0; i < count; i++) {
    const recOff = nameTableOffset + 6 + i * 12
    const platformID = u16(recOff)
    const languageID = u16(recOff + 4)
    const nameID = u16(recOff + 6)
    const length = u16(recOff + 8)
    const offset = u16(recOff + 10)
    // Windows platform, en-US — nameID 1 is the canonical Font Family name.
    if (platformID === 3 && languageID === 1033 && nameID === 1) {
      const strStart = nameTableOffset + stringOffset + offset
      const raw = ttfBuffer.subarray(strStart, strStart + length)
      const swapped = Buffer.alloc(raw.length)
      for (let j = 0; j + 1 < raw.length; j += 2) {
        swapped[j] = raw[j + 1]
        swapped[j + 1] = raw[j]
      }
      return swapped.toString('utf16le')
    }
  }
  throw new Error('readEnglishFamilyName: no platform=3/en-US nameID=1 record found')
}

// ─────── cmap glyph-coverage check (reporting only, never blocks) ───────

function readCoveredCodepoints(ttfBuffer) {
  const u16 = (off) => ttfBuffer.readUInt16BE(off)
  const u32 = (off) => ttfBuffer.readUInt32BE(off)
  const numTables = u16(4)
  let cmapOffset = null
  for (let i = 0; i < numTables; i++) {
    const recOff = 12 + i * 16
    if (ttfBuffer.toString('ascii', recOff, recOff + 4) === 'cmap') cmapOffset = u32(recOff + 8)
  }
  if (cmapOffset == null) return new Set()

  const numSubtables = u16(cmapOffset + 2)
  const covered = new Set()
  for (let i = 0; i < numSubtables; i++) {
    const recOff = cmapOffset + 4 + i * 8
    const subOffset = cmapOffset + u32(recOff + 4)
    const format = u16(subOffset)
    if (format === 4) {
      const segCountX2 = u16(subOffset + 6)
      const segCount = segCountX2 / 2
      const endCodeOff = subOffset + 14
      const startCodeOff = endCodeOff + segCountX2 + 2
      for (let s = 0; s < segCount; s++) {
        const endCode = u16(endCodeOff + s * 2)
        const startCode = u16(startCodeOff + s * 2)
        if (startCode === 0xffff && endCode === 0xffff) continue
        for (let cp = startCode; cp <= endCode; cp++) covered.add(cp)
      }
    } else if (format === 12) {
      const numGroups = u32(subOffset + 12)
      for (let g = 0; g < numGroups; g++) {
        const groupOff = subOffset + 16 + g * 12
        const startCharCode = u32(groupOff)
        const endCharCode = u32(groupOff + 4)
        for (let cp = startCharCode; cp <= endCharCode; cp++) covered.add(cp)
      }
    }
  }
  return covered
}

// ─────── main ───────

async function main() {
  const { all, stringsChars, fileCount } = buildCharset()
  const charsetString = [...all].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('')

  console.log(`[subset-ui-font] scanned ${fileCount} files under src/lib/strings/`)
  console.log(`[subset-ui-font] strings/ literal charset: ${stringsChars.size} chars`)
  console.log(`[subset-ui-font] full subset charset: ${all.size} chars`)

  const ttfBuffer = await ensureSourceFont()
  console.log(
    `[subset-ui-font] source: Zhuque Fangsong v${FONT_VERSION}, ${ttfBuffer.length.toLocaleString()} bytes unsubsetted`
  )

  const actualFamilyName = readEnglishFamilyName(ttfBuffer)
  if (actualFamilyName !== EXPECTED_FONT_FAMILY_NAME) {
    throw new Error(
      `font family name mismatch: expected "${EXPECTED_FONT_FAMILY_NAME}", ` +
        `TTF name table says "${actualFamilyName}". ` +
        'Update EXPECTED_FONT_FAMILY_NAME and the font-family in src/styles/fonts.css to match.'
    )
  }

  const covered = readCoveredCodepoints(ttfBuffer)
  const missing = [...stringsChars].filter((ch) => {
    const cp = ch.codePointAt(0)
    return cp > 0x20 && !covered.has(cp)
  })
  if (missing.length > 0) {
    console.warn(
      `[subset-ui-font] glyph-coverage gap: ${missing.length} char(s) from src/lib/strings/ have no glyph ` +
        `in Zhuque Fangsong and will render from the next font in --font-ui's fallback stack: ${missing.join(' ')}`
    )
  } else {
    console.log('[subset-ui-font] full glyph coverage for the src/lib/strings/ charset')
  }

  const subsetBuffer = await subsetFont(ttfBuffer, charsetString, {
    targetFormat: 'woff2',
    preserveNameIds: [1, 2, 3, 4, 6, 16, 17],
  })

  mkdirSync(path.dirname(OUTPUT_WOFF2), { recursive: true })
  writeFileSync(OUTPUT_WOFF2, subsetBuffer)

  const ratio = ((1 - subsetBuffer.length / ttfBuffer.length) * 100).toFixed(1)
  console.log(`[subset-ui-font] wrote ${path.relative(REPO_ROOT, OUTPUT_WOFF2)}`)
  console.log(
    `[subset-ui-font] ${ttfBuffer.length.toLocaleString()} bytes -> ${subsetBuffer.length.toLocaleString()} bytes (-${ratio}%)`
  )
}

main().catch((err) => {
  console.error('[subset-ui-font] failed:', err.message)
  process.exit(1)
})
