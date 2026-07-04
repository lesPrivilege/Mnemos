import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportData, importData, saveQuestions } from './storage'

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

describe('quiz storage schema version', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('writes a schema marker when quiz data is saved', () => {
    saveQuestions([{ id: 'q1', type: 'choice' }])

    expect(localStorage.getItem('examprep-schema-version')).toBe('1')
  })

  it('exports versioned quiz backups', () => {
    saveQuestions([{ id: 'q1', type: 'choice' }])

    expect(JSON.parse(exportData())).toMatchObject({
      version: 1,
      questions: [{ id: 'q1' }],
      progress: {},
      starred: [],
    })
  })

  it('imports legacy and versioned quiz payloads', () => {
    expect(
      importData(
        JSON.stringify({
          questions: [{ id: 'legacy' }],
          progress: { legacy: { status: 'todo' } },
          starred: ['legacy'],
        })
      )
    ).toEqual({ questions: 1, progress: 1, starred: 1 })
    expect(localStorage.getItem('examprep-schema-version')).toBe('1')

    expect(
      importData(
        JSON.stringify({
          version: 1,
          questions: [{ id: 'versioned' }],
          progress: {},
          starred: [],
        })
      )
    ).toEqual({ questions: 1, progress: 0, starred: 0 })
  })
})
