import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { idbDel, idbGet, idbSet } from '../../lib/idb'
import {
  ReadingStorageError,
  addDocument,
  deleteDocument,
  getDismissedContinueId,
  migrateBodiesToIDB,
  setDismissedContinueId,
  updateDocument,
} from './storage'

vi.mock('../../lib/idb', () => ({
  idbGet: vi.fn(),
  idbSet: vi.fn(),
  idbDel: vi.fn(),
}))

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
    store,
  }
}

function readStored(key, fallback = null) {
  const raw = localStorage.getItem(key)
  return raw === null ? fallback : JSON.parse(raw)
}

function seedStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

const bodies = new Map()

beforeEach(() => {
  vi.clearAllMocks()
  bodies.clear()
  vi.mocked(idbGet).mockImplementation(async (_store, id) => bodies.get(id))
  vi.mocked(idbSet).mockImplementation(async (_store, id, value) => {
    bodies.set(id, value)
    return true
  })
  vi.mocked(idbDel).mockImplementation(async (_store, id) => {
    bodies.delete(id)
    return true
  })
})

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

describe('reading document write consistency', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorage())
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'doc-new') })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('publishes hasBody metadata only after the body write has completed', async () => {
    let finishBodyWrite
    vi.mocked(idbSet).mockImplementationOnce(() => new Promise((resolve) => {
      finishBodyWrite = () => {
        bodies.set('doc-new', '# body')
        resolve(true)
      }
    }))

    const pending = addDocument('collection-1', 'Title', '# body')
    await vi.waitFor(() => expect(idbSet).toHaveBeenCalledOnce())
    expect(readStored('reading-documents', [])).toEqual([])

    finishBodyWrite()
    await expect(pending).resolves.toMatchObject({ id: 'doc-new', hasBody: true })
    expect(readStored('reading-documents')).toEqual([
      expect.objectContaining({ id: 'doc-new', hasBody: true }),
    ])
  })

  it('rejects an add when the body write fails without publishing metadata', async () => {
    vi.mocked(idbSet).mockResolvedValueOnce(false)

    await expect(addDocument('collection-1', 'Title', '# body')).rejects.toMatchObject({
      name: 'ReadingStorageError',
      operation: 'addDocument',
      stage: 'body',
    })
    expect(readStored('reading-documents', [])).toEqual([])
    expect(bodies.has('doc-new')).toBe(false)
  })

  it('rolls the body back when publishing document metadata fails', async () => {
    localStorage.setItem.mockImplementation((key, value) => {
      if (key === 'reading-documents') throw new DOMException('full', 'QuotaExceededError')
      localStorage.store.set(key, String(value))
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(addDocument('collection-1', 'Title', '# body')).rejects.toBeInstanceOf(ReadingStorageError)
    expect(readStored('reading-documents', [])).toEqual([])
    expect(bodies.has('doc-new')).toBe(false)
  })

  it('serializes concurrent additions so neither metadata record is lost', async () => {
    vi.mocked(crypto.randomUUID)
      .mockReturnValueOnce('doc-1')
      .mockReturnValueOnce('doc-2')

    await Promise.all([
      addDocument('collection-1', 'One', 'body one'),
      addDocument('collection-1', 'Two', 'body two'),
    ])

    expect(readStored('reading-documents').map(doc => doc.id)).toEqual(['doc-1', 'doc-2'])
  })

  it('does not overwrite a synchronous metadata update made while a body write is pending', async () => {
    seedStored('reading-documents', [{ id: 'doc-existing', title: 'Before' }])
    let finishBodyWrite
    vi.mocked(idbSet).mockImplementationOnce(() => new Promise((resolve) => {
      finishBodyWrite = () => {
        bodies.set('doc-new', 'new body')
        resolve(true)
      }
    }))

    const pending = addDocument('collection-1', 'New', 'new body')
    await vi.waitFor(() => expect(idbSet).toHaveBeenCalledOnce())
    updateDocument('doc-existing', { title: 'After' })
    finishBodyWrite()
    await pending

    expect(readStored('reading-documents')).toEqual([
      expect.objectContaining({ id: 'doc-existing', title: 'After' }),
      expect.objectContaining({ id: 'doc-new' }),
    ])
  })

  it('deletes body, highlights, bookmarks, and metadata for one document', async () => {
    seedStored('reading-documents', [
      { id: 'doc-1', hasBody: true },
      { id: 'doc-2', hasBody: true },
    ])
    seedStored('reading-highlights', [
      { id: 'hl-1', docId: 'doc-1' },
      { id: 'hl-2', docId: 'doc-2' },
    ])
    seedStored('reading-bookmarks', [
      { id: 'bm-1', docId: 'doc-1' },
      { id: 'bm-2', docId: 'doc-2' },
    ])
    bodies.set('doc-1', 'body one')
    bodies.set('doc-2', 'body two')

    await expect(deleteDocument('doc-1')).resolves.toEqual({ ok: true })

    expect(bodies.has('doc-1')).toBe(false)
    expect(readStored('reading-documents').map(doc => doc.id)).toEqual(['doc-2'])
    expect(readStored('reading-highlights').map(item => item.id)).toEqual(['hl-2'])
    expect(readStored('reading-bookmarks').map(item => item.id)).toEqual(['bm-2'])
  })

  it('rejects visibly and preserves all records when body deletion fails', async () => {
    seedStored('reading-documents', [{ id: 'doc-1', hasBody: true }])
    seedStored('reading-highlights', [{ id: 'hl-1', docId: 'doc-1' }])
    seedStored('reading-bookmarks', [{ id: 'bm-1', docId: 'doc-1' }])
    bodies.set('doc-1', 'body one')
    vi.mocked(idbDel).mockResolvedValueOnce(false)

    await expect(deleteDocument('doc-1')).rejects.toMatchObject({
      name: 'ReadingStorageError',
      operation: 'deleteDocument',
      stage: 'body',
    })
    expect(bodies.get('doc-1')).toBe('body one')
    expect(readStored('reading-documents')).toHaveLength(1)
    expect(readStored('reading-highlights')).toHaveLength(1)
    expect(readStored('reading-bookmarks')).toHaveLength(1)
  })

  it('rolls prior cleanup back and rejects when a related-record save fails', async () => {
    seedStored('reading-documents', [{ id: 'doc-1', hasBody: true }])
    seedStored('reading-highlights', [{ id: 'hl-1', docId: 'doc-1' }])
    seedStored('reading-bookmarks', [{ id: 'bm-1', docId: 'doc-1' }])
    bodies.set('doc-1', 'body one')
    let failed = false
    localStorage.setItem.mockImplementation((key, value) => {
      if (key === 'reading-bookmarks' && !failed) {
        failed = true
        throw new DOMException('full', 'QuotaExceededError')
      }
      localStorage.store.set(key, String(value))
    })
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(deleteDocument('doc-1')).rejects.toMatchObject({
      name: 'ReadingStorageError',
      operation: 'deleteDocument',
      stage: 'bookmarks',
      rollbackFailures: [],
    })
    expect(bodies.get('doc-1')).toBe('body one')
    expect(readStored('reading-documents')).toHaveLength(1)
    expect(readStored('reading-highlights')).toHaveLength(1)
    expect(readStored('reading-bookmarks')).toHaveLength(1)
  })

  it('keeps legacy inline content when its body migration does not commit', async () => {
    seedStored('reading-documents', [{ id: 'doc-legacy', content: 'only copy' }])
    vi.mocked(idbSet).mockResolvedValueOnce(false)

    await migrateBodiesToIDB()

    expect(readStored('reading-documents')).toEqual([{ id: 'doc-legacy', content: 'only copy' }])
  })

  it('removes legacy inline content only after its body migration commits', async () => {
    seedStored('reading-documents', [{ id: 'doc-legacy', content: 'only copy' }])

    await migrateBodiesToIDB()

    expect(bodies.get('doc-legacy')).toBe('only copy')
    expect(readStored('reading-documents')).toEqual([{ id: 'doc-legacy', hasBody: true }])
  })
})
