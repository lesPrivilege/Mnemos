import { describe, expect, it } from 'vitest'
import { buildQuizRoute } from './routes'

describe('buildQuizRoute', () => {
  it('encodes a free-form subject path segment', () => {
    expect(buildQuizRoute('quiz', 'data science/ml')).toBe('/quiz/data%20science%2Fml')
  })

  it('keeps a section query valid without requiring a chapter', () => {
    expect(buildQuizRoute('quiz-review', 'R&D', { section: 'A/B' }))
      .toBe('/quiz-review/R%26D?section=A%2FB')
  })

  it('preserves an explicit empty chapter or section scope', () => {
    expect(buildQuizRoute('quiz', 'research', { chapter: '', section: '' }))
      .toBe('/quiz/research?chapter=&section=')
  })

  it('encodes imported question ids as query data', () => {
    expect(buildQuizRoute('quiz', 'research', { mode: 'wrong', qid: 'R&D#1' }))
      .toBe('/quiz/research?mode=wrong&qid=R%26D%231')
  })
})
