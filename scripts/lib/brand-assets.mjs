import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseColorToken, rgbToHex } from '../collate/wcag.mjs'

const scriptsDir = dirname(dirname(fileURLToPath(import.meta.url)))
export const repoRoot = join(scriptsDir, '..')
export const markPath = join(repoRoot, 'src/assets/brand/mnemos-mark.svg')

const tokenCss = readFileSync(join(repoRoot, 'src/styles/tokens.css'), 'utf8')
export const markSource = readFileSync(markPath, 'utf8')

function themeBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = tokenCss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`))
  if (!match) throw new Error(`Missing token block: ${selector}`)
  return match[1]
}

function tokenHex(block, name) {
  const match = block.match(new RegExp(`--${name}:\\s*([^;]+);`))
  if (!match) throw new Error(`Missing brand token: --${name}`)
  const rgb = parseColorToken(match[1])
  if (!rgb) throw new Error(`Unsupported brand token value: --${name}: ${match[1]}`)
  return rgbToHex(rgb)
}

function palette(selector) {
  const block = themeBlock(selector)
  return {
    bg: tokenHex(block, 'bg'),
    ink: tokenHex(block, 'ink'),
    accent: tokenHex(block, 'accent'),
  }
}

export const brandPalette = {
  light: palette(':root'),
  dark: palette(':root.dark'),
}

function markBody({ ink, accent }) {
  return markSource
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replaceAll('currentColor', ink)
    .replaceAll('var(--mnemos-mark-accent, #af3a2c)', accent)
    .trim()
}

/** Compose the canonical 64×64 mark into a platform canvas. */
export function brandSvg({
  width,
  height = width,
  palette = brandPalette.dark,
  markSize = Math.min(width, height) * 0.64,
  background = palette.bg,
  radius = 0,
  opticalShiftY = markSize * 0.025,
}) {
  const x = (width - markSize) / 2
  const y = (height - markSize) / 2 + opticalShiftY
  const rect = background === 'none'
    ? ''
    : `<rect width="${width}" height="${height}" rx="${radius}" fill="${background}"/>`
  const mark = markSize > 0
    ? `<g transform="translate(${x} ${y}) scale(${markSize / 64})">${markBody(palette)}</g>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  ${rect}
  ${mark}
</svg>\n`
}
