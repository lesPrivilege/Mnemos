import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDismissedContinueId, setDismissedContinueId } from './storage'

function createLocalStorage() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

describe('reading dismissed-continue persistence', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips the dismissed continue doc id', () => {
    expect(getDismissedContinueId()).toBeNull()
    setDismissedContinueId('doc-1')
    expect(getDismissedContinueId()).toBe('doc-1')
  })

  it('记的是「这一篇」——换一篇提示即复现', () => {
    setDismissedContinueId('doc-1')
    setDismissedContinueId('doc-2')
    expect(getDismissedContinueId()).toBe('doc-2')
  })
})
