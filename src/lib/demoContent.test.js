import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  flashcards: { decks: [], cards: [] },
  questions: [],
  collections: [],
  documents: [],
}))

const mocks = vi.hoisted(() => ({
  addDocument: vi.fn(),
  deleteCollection: vi.fn(),
  saveData: vi.fn(),
  saveQuestions: vi.fn(),
}))

vi.mock('./dateUtils', () => ({ localToday: () => '2026-08-20' }))

vi.mock('./storage', () => ({
  loadData: () => state.flashcards,
  saveData: mocks.saveData,
}))

vi.mock('../quiz/lib/storage', () => ({
  loadQuestions: () => state.questions,
  saveQuestions: mocks.saveQuestions,
}))

vi.mock('../reading/lib/storage', () => ({
  getCollections: () => state.collections,
  getDocuments: () => state.documents,
  addCollection: vi.fn((name, icon) => {
    const collection = { id: `collection-${state.collections.length + 1}`, name, icon }
    state.collections.push(collection)
    return collection
  }),
  addDocument: mocks.addDocument,
  deleteCollection: mocks.deleteCollection,
}))

import { seedDemoContent } from './demoContent'

beforeEach(() => {
  vi.clearAllMocks()
  state.flashcards = { decks: [], cards: [] }
  state.questions = []
  state.collections = []
  state.documents = []
  mocks.saveData.mockImplementation((data) => { state.flashcards = data })
  mocks.saveQuestions.mockImplementation((questions) => { state.questions = questions })
  mocks.deleteCollection.mockImplementation((id) => {
    state.collections = state.collections.filter(collection => collection.id !== id)
  })
  mocks.addDocument.mockImplementation(async (collectionId, title) => {
    state.documents.push({ id: `doc-${state.documents.length + 1}`, collectionId, title })
  })
})

describe('seedDemoContent concurrency', () => {
  it('coalesces concurrent requests before the async document exists check can race', async () => {
    let releaseBody
    mocks.addDocument.mockImplementationOnce((collectionId, title) => new Promise((resolve) => {
      releaseBody = () => {
        state.documents.push({ id: 'doc-1', collectionId, title })
        resolve()
      }
    }))

    const first = seedDemoContent()
    const second = seedDemoContent()

    expect(second).toBe(first)
    await vi.waitFor(() => expect(mocks.addDocument).toHaveBeenCalledTimes(1))
    releaseBody()
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(firstResult).toEqual(secondResult)
    expect(state.documents).toHaveLength(1)
    expect(mocks.addDocument).toHaveBeenCalledTimes(1)

    await seedDemoContent()
    expect(mocks.addDocument).toHaveBeenCalledTimes(1)
  })

  it('releases the coalescing guard after a failed attempt so retry can succeed', async () => {
    mocks.addDocument.mockRejectedValueOnce(new Error('body write failed'))

    await expect(seedDemoContent()).rejects.toThrow('body write failed')
    expect(mocks.deleteCollection).toHaveBeenCalledTimes(1)

    await expect(seedDemoContent()).resolves.toMatchObject({ documents: 1 })
    expect(mocks.addDocument).toHaveBeenCalledTimes(2)
    expect(state.documents).toHaveLength(1)
  })
})
