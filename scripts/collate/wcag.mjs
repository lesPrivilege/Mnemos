/**
 * wcag.mjs — color math for the 死校·对比度 gate (collate.mjs gate 3).
 *
 * Pure functions, no dependencies: hex → sRGB, oklch → sRGB (via Björn
 * Ottosson's oklab matrices, D65), sRGB gamma encode/decode, WCAG relative
 * luminance and contrast ratio.
 *
 * All RGB channel values in this module are floats in [0, 1] unless a
 * function name says otherwise (e.g. `toByte`, `rgbToHex`).
 */

// ─────── hex → sRGB ───────

/** Parse a `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa` literal into {r,g,b} in [0,1]. */
export function hexToRgb01(hex) {
  const h = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(h) || ![3, 4, 6, 8].includes(h.length)) {
    throw new Error(`hexToRgb01: not a valid hex color literal: "${hex}"`)
  }
  const expand = (s) => (s.length === 1 ? s + s : s)
  let r, g, b
  if (h.length === 3 || h.length === 4) {
    r = expand(h[0])
    g = expand(h[1])
    b = expand(h[2])
  } else {
    r = h.slice(0, 2)
    g = h.slice(2, 4)
    b = h.slice(4, 6)
  }
  return {
    r: parseInt(r, 16) / 255,
    g: parseInt(g, 16) / 255,
    b: parseInt(b, 16) / 255,
  }
}

// ─────── sRGB gamma encode ───────

/** Linear-light channel (any real number) → gamma-encoded sRGB channel. */
export function linearToSrgb(c) {
  const sign = c < 0 ? -1 : 1
  const abs = Math.abs(c)
  const encoded = abs <= 0.0031308 ? abs * 12.92 : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055
  return sign * encoded
}

/** Gamma-encoded sRGB channel in [0,1] → linear-light channel. Inverse of linearToSrgb. */
export function srgbToLinear(c) {
  const sign = c < 0 ? -1 : 1
  const abs = Math.abs(c)
  const linear = abs <= 0.04045 ? abs / 12.92 : Math.pow((abs + 0.055) / 1.055, 2.4)
  return sign * linear
}

// ─────── oklch → sRGB (Ottosson oklab matrices, D65) ───────

const OUT_OF_GAMUT_EPS = 0.01 // 1% overshoot past [0,1] before clamping counts as out-of-gamut

/**
 * oklch(L, C, H) → sRGB.
 * @param {number} L lightness as a FRACTION in [0,1] (i.e. the CSS "62.796%" / 100)
 * @param {number} C chroma (unitless, as written in oklch())
 * @param {number} H hue in degrees
 * @returns {{r:number,g:number,b:number,outOfGamut:boolean}} clamped-to-[0,1] sRGB + gamut flag
 */
export function oklchToSrgb(L, C, H) {
  const hRad = (H * Math.PI) / 180
  const a = C * Math.cos(hRad)
  const b = C * Math.sin(hRad)

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b

  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3

  const rLin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

  const rEnc = linearToSrgb(rLin)
  const gEnc = linearToSrgb(gLin)
  const bEnc = linearToSrgb(bLin)

  const outOfGamut = [rEnc, gEnc, bEnc].some(
    (c) => c < -OUT_OF_GAMUT_EPS || c > 1 + OUT_OF_GAMUT_EPS
  )

  const clamp01 = (c) => Math.min(1, Math.max(0, c))
  return { r: clamp01(rEnc), g: clamp01(gEnc), b: clamp01(bEnc), outOfGamut }
}

// ─────── generic token-value parser ───────

const HEX_RE = /^#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})$/
const OKLCH_RE = /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)$/

/**
 * Parse a CSS custom-property value that is either a hex literal or an
 * `oklch(L% C H)` literal into {r,g,b,outOfGamut}. Returns null for anything
 * else (var(...), color-mix(...), none, keywords) — those are "derived" and
 * out of scope for the contrast gate, per design-kanli.md §九.
 */
export function parseColorToken(rawValue) {
  const value = rawValue.trim()
  if (HEX_RE.test(value)) {
    return { ...hexToRgb01(value), outOfGamut: false }
  }
  const m = OKLCH_RE.exec(value)
  if (m) {
    const L = parseFloat(m[1]) / 100
    const C = parseFloat(m[2])
    const H = parseFloat(m[3])
    return oklchToSrgb(L, C, H)
  }
  return null
}

// ─────── WCAG relative luminance + contrast ───────

function channelLuminance(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** WCAG relative luminance of an {r,g,b} triple in [0,1]. */
export function relativeLuminance({ r, g, b }) {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** WCAG contrast ratio between two {r,g,b} triples in [0,1]. Always >= 1. */
export function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA)
  const lB = relativeLuminance(rgbB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

// ─────── display helpers ───────

function toByte(c) {
  return Math.round(Math.min(1, Math.max(0, c)) * 255)
}

/** {r,g,b} in [0,1] → "#rrggbb" (for reporting / test-vector comparison). */
export function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((c) => toByte(c).toString(16).padStart(2, '0')).join('')
}

/** Max per-channel absolute byte distance (0-255) between two {r,g,b} triples. */
export function maxChannelByteDelta(rgbA, rgbB) {
  return Math.max(
    Math.abs(toByte(rgbA.r) - toByte(rgbB.r)),
    Math.abs(toByte(rgbA.g) - toByte(rgbB.g)),
    Math.abs(toByte(rgbA.b) - toByte(rgbB.b))
  )
}
