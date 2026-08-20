// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ parent: '/?view=materials&kind=quiz' }))
const mocks = vi.hoisted(() => ({
  addQuestions: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => ({ pathname: '/import', search: '?tab=json', state: null }),
  useNavigate: () => mocks.navigate,
  useSearchParams: () => [new URLSearchParams('tab=json')],
}))

vi.mock('../quiz/lib/storage', () => ({
  addQuestions: mocks.addQuestions,
  importData: vi.fn(),
  loadProgress: () => ({}),
  loadStarred: () => [],
  mergeImportData: vi.fn(),
  saveProgress: vi.fn(),
  saveStarred: vi.fn(),
}))

vi.mock('../quiz/lib/questionParser', () => ({
  getQuestionsStats: () => ({ total: 1, byType: { choice: 1 }, bySubject: { 数学: 1 } }),
  parseQuestionsJson: () => ({ questions: [{ id: 'q1', subject: '数学', type: 'choice', question: '题目', answer: 'A' }], errors: [] }),
}))

vi.mock('../quiz/lib/subjectNames', () => ({
  getSubjectDisplayName: (subject) => subject,
}))

vi.mock('../lib/storage', () => ({
  addCard: vi.fn(),
  addDeck: vi.fn(),
  getCards: vi.fn(() => []),
  getDeck: vi.fn(),
  getDecks: vi.fn(() => []),
  importData: vi.fn(),
  loadData: vi.fn(() => ({ decks: [], cards: [] })),
  mergeData: vi.fn(),
}))

vi.mock('../lib/mdParser', () => ({ parseMdToCards: vi.fn(() => ({ cards: [], deckName: '' })) }))
vi.mock('../lib/ankiParser', () => ({ parseAnkiToCards: vi.fn(() => ({ cards: [], deckName: '' })) }))

vi.mock('../reading/lib/storage', () => ({
  addCollection: vi.fn(),
  addDocument: vi.fn(),
  deleteCollection: vi.fn(),
  getCollections: vi.fn(() => []),
}))
vi.mock('../reading/lib/backup', () => ({ importReadingData: vi.fn(), mergeReadingData: vi.fn() }))
vi.mock('../reading/lib/importer', () => ({
  ACCEPT: '.md,.txt',
  readFileAsDocument: vi.fn(),
}))

vi.mock('../lib/useBackButton', () => ({
  useBackButton: () => ({ goBack: vi.fn(), parent: state.parent }),
}))
vi.mock('../lib/platform', () => ({ isNative: () => false }))
vi.mock('../lib/a11y', () => ({ pressable: () => ({}) }))
vi.mock('../components/Toast', () => ({
  Toast: () => null,
  useToast: () => ({ toast: null, showToast: vi.fn() }),
}))
vi.mock('../components/ConfirmSheet', () => ({
  ConfirmSheet: () => null,
  useConfirm: () => ({ confirmState: null, confirm: vi.fn() }),
}))

import Import from './Import'

async function confirmQuestionImport() {
  const { container } = render(<Import />)
  const input = container.querySelector('input[type="file"]')
  fireEvent.change(input, { target: { files: [new File(['[{}]'], 'questions.json', { type: 'application/json' })] } })

  await screen.findByText('JSON 导入预览')
  fireEvent.click(screen.getByRole('button', { name: '确认导入' }))
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(1))
}

beforeEach(() => {
  vi.resetAllMocks()
  state.parent = '/?view=materials&kind=quiz'
  mocks.addQuestions.mockReturnValue({ added: 1, duplicates: 0 })
})

afterEach(cleanup)

describe('quiz JSON import return hierarchy', () => {
  it('returns to a validated SetDetail parent supplied by useBackButton', async () => {
    state.parent = '/set/%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80'

    await confirmQuestionImport()

    expect(mocks.navigate).toHaveBeenCalledWith('/set/%E6%95%B0%E5%AD%A6%2F%E5%9F%BA%E7%A1%80')
  })

  it('uses the canonical quiz materials parent for a cold import route', async () => {
    await confirmQuestionImport()

    expect(mocks.navigate).toHaveBeenCalledWith('/?view=materials&kind=quiz')
  })
})
