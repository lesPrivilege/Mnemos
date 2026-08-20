// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CardEditor from './CardEditor'

afterEach(cleanup)

describe('CardEditor shape hierarchy', () => {
  it('uses the field/button radius for controls while leaving preview surfaces alone', () => {
    const { container } = render(<CardEditor onSave={vi.fn()} onCancel={vi.fn()} />)
    const textareas = [...container.querySelectorAll('textarea')]
    const actionButtons = [...container.querySelectorAll('button')].filter(button =>
      button.type === 'submit' || button.textContent === '取消')

    expect(textareas).toHaveLength(2)
    expect(actionButtons).toHaveLength(2)
    expect([...textareas, ...actionButtons].every(control => control.classList.contains('rounded-md'))).toBe(true)
    expect([...textareas, ...actionButtons].every(control => !control.classList.contains('rounded-lg'))).toBe(true)
  })
})
