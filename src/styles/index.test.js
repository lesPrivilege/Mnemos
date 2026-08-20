// @vitest-environment node

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

describe('wide layout overlay exclusions', () => {
  it('keeps menu scrims outside the constrained content column', () => {
    expect(css).toContain('.page-fill > *:not(.topbar):not(.confirm-backdrop):not(.menu-backdrop)')
    expect(css).toContain('.page-fixed > *:not(.topbar):not(.confirm-backdrop):not(.menu-backdrop)')
  })
})

describe('surface grammar', () => {
  it('keeps settings metrics as one flat group instead of three cards', () => {
    const rule = css.match(/\.settings-metrics div \{([\s\S]*?)\}/)?.[1] || ''

    expect(rule).not.toMatch(/background\s*:/)
    expect(rule).not.toMatch(/border-radius\s*:/)
    expect(rule).not.toMatch(/border\s*:/)
    expect(css).toContain('.settings-metrics div + div { border-left: 1px solid var(--border-soft); }')
  })

  it('puts collection secondary boundaries on actions, not their group', () => {
    const groupRule = css.match(/\.dd-secondary \{([\s\S]*?)\}/)?.[1] || ''
    const actionRule = css.match(/\.dd-secondary \.dd-action \{([\s\S]*?)\}/)?.[1] || ''

    expect(groupRule).not.toMatch(/background\s*:/)
    expect(groupRule).not.toMatch(/border-radius\s*:/)
    expect(groupRule).not.toMatch(/border\s*:/)
    expect(actionRule).toMatch(/border:\s*1px solid var\(--border-soft\)/)
    expect(actionRule).toMatch(/min-height:\s*var\(--hit-target\)/)
  })
})
