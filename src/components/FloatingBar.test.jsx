// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FloatingBar from './FloatingBar'

let blockSize
let notifyResize
let originalResizeObserver

beforeEach(() => {
  blockSize = 180
  originalResizeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(callback) {
      notifyResize = callback
    }

    observe() {}
    disconnect() {}
  }

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
    return { height: this.classList.contains('floating-bar') ? blockSize : 0 }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  globalThis.ResizeObserver = originalResizeObserver
})

describe('FloatingBar scroll clearance', () => {
  it('tracks its live height as text scaling changes it', () => {
    const { container, unmount } = render(
      <div className="page-fill">
        <main />
        <FloatingBar><button type="button">开始练习</button></FloatingBar>
      </div>,
    )
    const shell = container.querySelector('.page-fill')

    expect(shell.style.getPropertyValue('--floating-bar-block-size')).toBe('180px')

    blockSize = 272
    act(() => notifyResize())
    expect(shell.style.getPropertyValue('--floating-bar-block-size')).toBe('272px')

    unmount()
    expect(shell.style.getPropertyValue('--floating-bar-block-size')).toBe('')
  })
})
