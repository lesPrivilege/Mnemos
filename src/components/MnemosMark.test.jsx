// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MnemosMark from './MnemosMark'

describe('MnemosMark', () => {
  it('renders the canonical SVG with contextual brand colors', () => {
    const { container } = render(
      <MnemosMark size={32} color="inherit" accent="var(--test-accent)" label="Mnemos" />,
    )

    const wrapper = container.querySelector('.mnemos-mark')
    expect(wrapper.getAttribute('role')).toBe('img')
    expect(wrapper.getAttribute('aria-label')).toBe('Mnemos')
    expect(wrapper.style.width).toBe('32px')
    expect(wrapper.style.color).toBe('inherit')
    expect(wrapper.style.getPropertyValue('--mnemos-mark-accent')).toBe('var(--test-accent)')
    expect(wrapper.querySelectorAll('[data-brand-tone="ink"]')).toHaveLength(2)
    expect(wrapper.querySelectorAll('[data-brand-tone="accent"]')).toHaveLength(1)
  })

  it('is decorative when no label is supplied', () => {
    const { container } = render(<MnemosMark />)
    expect(container.querySelector('.mnemos-mark').getAttribute('aria-hidden')).toBe('true')
  })
})
