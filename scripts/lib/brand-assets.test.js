import { describe, expect, it } from 'vitest'
import { brandPalette, brandSvg, markSource } from './brand-assets.mjs'

describe('brand asset source', () => {
  it('resolves both platform palettes from design tokens', () => {
    expect(brandPalette.light).toEqual({ bg: '#f6f7f8', ink: '#1d2022', accent: '#af3a2c' })
    expect(brandPalette.dark).toEqual({ bg: '#0c0f10', ink: '#e2e5e7', accent: '#e2604f' })
  })

  it('composes native art from the canonical mark without unresolved colors', () => {
    const output = brandSvg({ width: 1024 })
    expect(markSource).toContain('data-brand-tone="accent"')
    expect(output).toContain('d="M10 52V14h10l12 16 12-16h10v38"')
    expect(output).not.toContain('currentColor')
    expect(output).not.toContain('var(--mnemos-mark-accent')
  })
})
