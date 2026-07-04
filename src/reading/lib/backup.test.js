import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportReadingData, importReadingData } from './backup'

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

describe('reading backup schema version', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('exports reading data with version 1', async () => {
    localStorage.setItem('reading-collections', JSON.stringify([{ id: 'collection-1' }]))
    localStorage.setItem('reading-documents', JSON.stringify([]))

    await expect(exportReadingData()).resolves.toMatchObject({
      version: 1,
      'reading-collections': [{ id: 'collection-1' }],
      'reading-documents': [],
    })
  })

  it('imports legacy and versioned reading payloads and writes the marker key', async () => {
    await importReadingData({
      'reading-collections': [{ id: 'legacy' }],
      'reading-documents': [],
    })

    expect(localStorage.getItem('reading-schema-version')).toBe('1')
    expect(JSON.parse(localStorage.getItem('reading-collections'))).toEqual([{ id: 'legacy' }])

    await importReadingData({
      version: 1,
      'reading-collections': [{ id: 'versioned' }],
      'reading-documents': [],
    })

    expect(JSON.parse(localStorage.getItem('reading-collections'))).toEqual([{ id: 'versioned' }])
  })
})
