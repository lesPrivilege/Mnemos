import { describe, expect, it } from 'vitest'
import {
  contrastRatio,
  hexToRgb01,
  linearToSrgb,
  maxChannelByteDelta,
  oklchToSrgb,
  parseColorToken,
  relativeLuminance,
  rgbToHex,
  srgbToLinear,
} from './wcag.mjs'

// ±1/255 per channel, per design-collation-derived spec (docs/design-collation.md 记-03 /
// the collate task brief). Byte-rounding + floating point means an exact match
// isn't guaranteed even for "nice" oklch values.
const CHANNEL_TOLERANCE = 1

describe('wcag.mjs — oklch → sRGB test vectors', () => {
  it('oklch(100% 0 0) → #ffffff', () => {
    const rgb = oklchToSrgb(1, 0, 0)
    expect(maxChannelByteDelta(rgb, hexToRgb01('#ffffff'))).toBeLessThanOrEqual(CHANNEL_TOLERANCE)
    expect(rgbToHex(rgb)).toBe('#ffffff')
  })

  it('oklch(0% 0 0) → #000000', () => {
    const rgb = oklchToSrgb(0, 0, 0)
    expect(maxChannelByteDelta(rgb, hexToRgb01('#000000'))).toBeLessThanOrEqual(CHANNEL_TOLERANCE)
    expect(rgbToHex(rgb)).toBe('#000000')
  })

  it('oklch(62.796% 0.25768 29.234) → approx #ff0000', () => {
    const rgb = oklchToSrgb(0.62796, 0.25768, 29.234)
    expect(maxChannelByteDelta(rgb, hexToRgb01('#ff0000'))).toBeLessThanOrEqual(CHANNEL_TOLERANCE)
    expect(rgb.outOfGamut).toBe(false)
  })
})

describe('wcag.mjs — contrast ratio', () => {
  it('ratio(#000000, #ffffff) = 21', () => {
    const ratio = contrastRatio(hexToRgb01('#000000'), hexToRgb01('#ffffff'))
    expect(ratio).toBeCloseTo(21, 5)
  })

  it('is symmetric regardless of argument order', () => {
    const a = hexToRgb01('#333333')
    const b = hexToRgb01('#eeeeee')
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('ratio of a color against itself is 1', () => {
    const c = hexToRgb01('#B86A30')
    expect(contrastRatio(c, c)).toBeCloseTo(1, 10)
  })
})

describe('wcag.mjs — hex parsing', () => {
  it('expands 3-digit hex', () => {
    expect(hexToRgb01('#fff')).toEqual({ r: 1, g: 1, b: 1 })
    expect(hexToRgb01('#000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('parses 6-digit hex', () => {
    const rgb = hexToRgb01('#B86A30')
    expect(rgb.r).toBeCloseTo(0xb8 / 255, 10)
    expect(rgb.g).toBeCloseTo(0x6a / 255, 10)
    expect(rgb.b).toBeCloseTo(0x30 / 255, 10)
  })

  it('rejects invalid lengths', () => {
    expect(() => hexToRgb01('#12345')).toThrow()
  })
})

describe('wcag.mjs — gamma round-trip', () => {
  it('linearToSrgb and srgbToLinear invert each other', () => {
    for (const v of [0, 0.001, 0.0031308, 0.18, 0.5, 1]) {
      expect(srgbToLinear(linearToSrgb(v))).toBeCloseTo(v, 6)
    }
  })
})

describe('wcag.mjs — parseColorToken', () => {
  it('parses hex tokens', () => {
    expect(parseColorToken('#B86A30')).not.toBeNull()
  })

  it('parses oklch tokens', () => {
    const c = parseColorToken('oklch(98.2% 0.002 250)')
    expect(c).not.toBeNull()
    expect(c.outOfGamut).toBe(false)
  })

  it('returns null for derived values (var/color-mix/none)', () => {
    expect(parseColorToken('var(--bg-card)')).toBeNull()
    expect(parseColorToken('color-mix(in oklch, var(--bg-card) 88%, transparent)')).toBeNull()
    expect(parseColorToken('none')).toBeNull()
  })
})

describe('wcag.mjs — relativeLuminance', () => {
  it('white is 1, black is 0', () => {
    expect(relativeLuminance(hexToRgb01('#ffffff'))).toBeCloseTo(1, 10)
    expect(relativeLuminance(hexToRgb01('#000000'))).toBeCloseTo(0, 10)
  })
})
