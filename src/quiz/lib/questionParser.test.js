import { describe, expect, it } from 'vitest'
import { getQuestionsStats, parseQuestionsJson } from './questionParser'

describe('parseQuestionsJson', () => {
  it('normalizes imported questions and preserves supported metadata', () => {
    const { questions, errors } = parseQuestionsJson(
      JSON.stringify([
        {
          id: 'ch02-data-choice001',
          subject: 'computer-organization',
          chapter: '2 数据的表示和运算',
          type: 'choice',
          question: 'Q',
          options: ['A. one - ', 'B. two'],
          answer: 'A',
          explanation: 'Because',
          tags: {
            origin: '真题',
            exam_years: [2024],
            frequency: 'high',
            difficulty: 'medium',
            image: 'solution.png',
          },
        },
        {
          id: 'review001',
          type: 'calculation',
          chapter: '第3章 CPU',
          answer: '42',
        },
      ]),
      '/imports/computer-organization/questions.json'
    )

    expect(errors).toEqual([])
    expect(questions[0]).toMatchObject({
      id: 'ch02-data-choice001',
      source: '王道计组',
      subject: 'computer-organization',
      chapter: '第2章 数据的表示和运算',
      section: 'data',
      type: 'choice',
      options: ['A. one', 'B. two'],
      answer: 'A',
      solution_path: 'solution.png',
      metadata: {
        origin: '真题',
        exam_years: [2024],
        frequency: 'high',
        difficulty: 'medium',
      },
    })
    expect(questions[1]).toMatchObject({
      id: 'review001',
      source: '王道计组',
      subject: 'unknown',
      chapter: '第3章 CPU',
      type: 'review',
      answer: '42',
    })
  })

  it('reports invalid records and warns about optionless choice questions', () => {
    const { questions, errors } = parseQuestionsJson(
      JSON.stringify([
        { type: 'choice', answer: 'A' },
        { id: 'missing-type' },
        { id: 'unknown-type', type: 'fill' },
        { id: 'no-options', type: 'choice', answer: 'A' },
      ]),
      ''
    )

    expect(questions).toHaveLength(1)
    expect(errors).toEqual([
      '跳过无效题目: 缺少 id',
      '跳过题目 missing-type: 缺少 type',
      '跳过题目 unknown-type: 未知类型 "fill"',
      '警告: 选择题 no-options 没有选项',
    ])
  })
})

describe('getQuestionsStats', () => {
  it('counts questions by type, subject, and source', () => {
    expect(
      getQuestionsStats([
        { type: 'choice', subject: 'os', source: 'book' },
        { type: 'choice', subject: 'os', source: 'book' },
        { type: 'review', subject: 'network', source: 'mock' },
      ])
    ).toEqual({
      total: 3,
      byType: { choice: 2, review: 1 },
      bySubject: { os: 2, network: 1 },
      bySource: { book: 2, mock: 1 },
    })
  })
})
