import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./storage', () => ({
  loadProgress: vi.fn(),
  loadQuestions: vi.fn(),
  recordAttempt: vi.fn(),
}))

vi.mock('../../lib/utils', () => ({
  shuffle: vi.fn((items) => [...items]),
}))

import { shuffle } from '../../lib/utils'
import { loadProgress, loadQuestions, recordAttempt } from './storage'
import {
  getQuizQuestions,
  getWrongQuestions,
  hasValidAnswer,
  isInWrongBook,
  submitAnswer,
} from './quizEngine'

const nowSeconds = 1_800_000_000

const questions = [
  {
    id: 'q1',
    subject: 'os',
    chapter: 'c1',
    section: 's1',
    type: 'choice',
    answer: 'A',
    explanation: 'A wins',
  },
  {
    id: 'q2',
    subject: 'os',
    chapter: 'c1',
    section: 's2',
    type: 'review',
    answer: 'Review answer',
  },
  {
    id: 'q3',
    subject: 'network',
    chapter: 'c2',
    section: 's1',
    type: 'choice',
    answer: '',
  },
  {
    id: 'q4',
    subject: 'os',
    chapter: 'c1',
    section: 's1',
    type: 'choice',
    answer: 'AB',
  },
]

function setStore(progress = {}) {
  loadQuestions.mockReturnValue(questions)
  loadProgress.mockReturnValue(progress)
}

describe('quizEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSeconds * 1000)
    vi.clearAllMocks()
    setStore()
    recordAttempt.mockReturnValue({ status: 'done', wrongStreak: 0 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('validates choice answers while allowing review questions', () => {
    expect(hasValidAnswer({ type: 'choice', answer: ' A ' })).toBe(true)
    expect(hasValidAnswer({ type: 'choice', answer: '' })).toBe(false)
    expect(hasValidAnswer({ type: 'review', answer: '' })).toBe(true)
  })

  it('keeps wrong-book items until they build a two-answer right streak', () => {
    expect(isInWrongBook({ wrong_count: 1, rightStreak: 0 })).toBe(true)
    expect(isInWrongBook({ wrong_count: 1, rightStreak: 2 })).toBe(false)
    expect(isInWrongBook(null)).toBe(false)
  })

  it('filters sequential questions by subject/chapter/section/type and limit', () => {
    expect(
      getQuizQuestions({
        subject: 'os',
        chapter: 'c1',
        section: 's1',
        type: 'choice',
        mode: 'sequential',
        limit: 1,
      }).map((question) => question.id)
    ).toEqual(['q1'])
  })

  it('shuffles random questions before limiting', () => {
    expect(getQuizQuestions({ mode: 'random', limit: 2 }).map((question) => question.id)).toEqual([
      'q1',
      'q2',
    ])
    expect(shuffle).toHaveBeenCalled()
  })

  it('returns wrong-book questions for wrong mode', () => {
    setStore({
      q1: { wrong_count: 1, rightStreak: 0 },
      q4: { wrong_count: 1, rightStreak: 2 },
    })

    expect(getQuizQuestions({ mode: 'wrong', limit: 10 }).map((question) => question.id)).toEqual([
      'q1',
    ])
  })

  it('returns todo or unseen questions for new mode and drops invalid choice questions', () => {
    setStore({
      q1: { status: 'done' },
      q2: { status: 'todo' },
    })

    expect(getQuizQuestions({ mode: 'new', limit: 10 }).map((question) => question.id)).toEqual([
      'q2',
      'q4',
    ])
  })

  it('returns spaced due wrong questions for due mode', () => {
    setStore({
      q1: { status: 'wrong', attempts: 1, last_attempt: nowSeconds - 3600 },
      q2: { status: 'wrong', attempts: 2, last_attempt: nowSeconds - 60 },
      q4: { status: 'done', attempts: 4, last_attempt: nowSeconds - 604800 },
    })

    expect(getQuizQuestions({ mode: 'due', limit: 10 }).map((question) => question.id)).toEqual([
      'q1',
    ])
  })

  it('returns starred questions from the explicit starred id list', () => {
    expect(
      getQuizQuestions({ mode: 'starred', starredIds: ['q4', 'missing'], limit: 10 }).map(
        (question) => question.id
      )
    ).toEqual(['q4'])
  })

  it('normalizes choice answers before recording attempts', () => {
    expect(submitAnswer('q4', 'b, a')).toMatchObject({
      correct: true,
      explanation: '',
      status: 'done',
      wrongStreak: 0,
    })
    expect(recordAttempt).toHaveBeenCalledWith('q4', true)
  })

  it('returns newest wrong-book questions with progress data', () => {
    setStore({
      q1: { wrong_count: 1, rightStreak: 0, last_attempt: 10 },
      q2: { wrong_count: 1, rightStreak: 0, last_attempt: 20 },
      q4: { wrong_count: 1, rightStreak: 2, last_attempt: 30 },
    })

    expect(getWrongQuestions('os', 2).map((question) => question.id)).toEqual(['q2', 'q1'])
  })
})
