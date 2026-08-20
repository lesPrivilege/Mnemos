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
