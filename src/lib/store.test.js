import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getQuarantinedRaw, listQuarantined } from './quarantine'
import { loadJson, removeKey, saveJson } from './store'

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

describe('store.js localStorage primitive', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns the fallback when the key is absent', () => {
    expect(loadJson('missing-key', { ok: false })).toEqual({ ok: false })
    expect(listQuarantined()).toEqual([])
  })

  it('quarantines corrupt JSON and returns the fallback', () => {
    localStorage.setItem('broken-key', '{oops')

    expect(loadJson('broken-key', [])).toEqual([])
    expect(getQuarantinedRaw('broken-key')).toBe('{oops')
    expect(listQuarantined()).toEqual([
      expect.objectContaining({
        key: 'broken-key',
        error: expect.stringContaining('JSON'),
      }),
    ])
  })

  it('quarantines values rejected by validation', () => {
    localStorage.setItem('wrong-shape', JSON.stringify({ items: [] }))

    expect(loadJson('wrong-shape', [], Array.isArray)).toEqual([])
    expect(getQuarantinedRaw('wrong-shape')).toBe('{"items":[]}')
    expect(listQuarantined()).toEqual([
      expect.objectContaining({
        key: 'wrong-shape',
        error: 'Invalid format',
      }),
    ])
  })

  it('returns a quota result when localStorage is full', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = new Error('full')
    error.name = 'QuotaExceededError'
    localStorage.setItem.mockImplementation(() => {
      throw error
    })

    expect(saveJson('full-key', { large: true }, { label: '测试未保存' })).toEqual({
      ok: false,
      error: '储存空间已满，测试未保存',
    })
    expect(warn).toHaveBeenCalledWith('Storage full for key "full-key": 测试未保存')
  })

  it('removes a key', () => {
    localStorage.setItem('old-key', JSON.stringify({ ok: true }))

    removeKey('old-key')

    expect(localStorage.getItem('old-key')).toBeNull()
  })
})
