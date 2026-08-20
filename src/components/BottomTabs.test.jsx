// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BottomTabs from './BottomTabs'

const tabs = [
  { key: 'today', label: '今日', to: '/' },
  { key: 'materials', label: '资料', to: '/?view=materials' },
  { key: 'activity', label: '活动', to: '/activity' },
]

let blockSize
let notifyResize
let originalResizeObserver
let originalVisualViewportDescriptor
let visualViewport

function renderTabs(props = {}) {
  return render(
    <MemoryRouter>
      <BottomTabs activeTab="today" tabs={tabs} {...props} />
    </MemoryRouter>,
    { container: document.getElementById('root') },
  )
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  blockSize = 48
  originalResizeObserver = globalThis.ResizeObserver
  originalVisualViewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  visualViewport = new EventTarget()
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport })
  globalThis.ResizeObserver = class ResizeObserverMock {
    constructor(callback) {
      notifyResize = callback
    }

    observe() {}
    disconnect() {}
  }

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
    return { height: this.classList.contains('bottom-tabs') ? blockSize : 0 }
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  globalThis.ResizeObserver = originalResizeObserver
  if (originalVisualViewportDescriptor) {
    Object.defineProperty(window, 'visualViewport', originalVisualViewportDescriptor)
  } else {
    delete window.visualViewport
  }
  document.body.innerHTML = ''
})

describe('BottomTabs block-size ownership', () => {
  it('tracks ordinary and Dynamic Type heights, then clears on unmount', () => {
    const { unmount } = renderTabs()
    const root = document.getElementById('root')

    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('48px')

    blockSize = 112
    act(() => notifyResize())
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('112px')

    unmount()
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('')
  })

  it('removes the runtime value when the route hides the nav and restores it when shown', () => {
    const { rerender } = renderTabs()
    const root = document.getElementById('root')

    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('48px')

    rerender(
      <MemoryRouter>
        <BottomTabs activeTab="today" tabs={tabs} visible={false} />
      </MemoryRouter>,
    )
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('')
    expect(root.querySelector('.bottom-tabs')).toBeNull()

    rerender(
      <MemoryRouter>
        <BottomTabs activeTab="today" tabs={tabs} visible />
      </MemoryRouter>,
    )
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('48px')
  })

  it('measures initially and follows window and visualViewport resize without ResizeObserver', () => {
    globalThis.ResizeObserver = undefined
    renderTabs()
    const root = document.getElementById('root')

    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('48px')

    blockSize = 96
    act(() => window.dispatchEvent(new Event('resize')))
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('96px')

    blockSize = 144
    act(() => visualViewport.dispatchEvent(new Event('resize')))
    expect(root.style.getPropertyValue('--bottom-tabs-block-size')).toBe('144px')
  })

  it('uses a conservative safe-area fallback when the first measurement is unavailable', () => {
    globalThis.ResizeObserver = undefined
    blockSize = 0
    renderTabs()

    expect(document.getElementById('root').style.getPropertyValue('--bottom-tabs-block-size'))
      .toBe('calc(96px + env(safe-area-inset-bottom, 0px))')
  })

  it('keeps the bottom-tab clearance on the two real L0 scroll owners only', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8')

    expect(styles).toMatch(/\.home-scroll[\s\S]*?--bottom-tabs-block-size/)
    expect(styles).toMatch(/\.primary-tab-screen > \.page-scroll[\s\S]*?--bottom-tabs-block-size/)
    expect(styles).not.toMatch(/\.today-empty\s*\{[^}]*padding-bottom/)
    expect(styles).not.toMatch(/\.tab-pane\s*\{[^}]*padding-bottom/)
  })
})
