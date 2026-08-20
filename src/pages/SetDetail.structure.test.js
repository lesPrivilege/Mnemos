// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { buildSetDetailTreeNodes } from './SetDetail'

const progress = {}

describe('SetDetail structure scopes', () => {
  it('splits mixed section types into explicit route leaves', () => {
    const nodes = buildSetDetailTreeNodes([
      { id: 'choice', chapter: '第一章', section: '第一节', type: 'choice' },
      { id: 'review', chapter: '第一章', section: '第一节', type: 'review' },
    ], progress)

    const section = nodes[0].children[0]
    expect(section.children.map(node => node.quizType)).toEqual(['choice', 'review'])
    expect(section.children.map(node => node.count)).toEqual([1, 1])
  })

  it('keeps a pure review chapter on the review route', () => {
    const nodes = buildSetDetailTreeNodes([
      { id: 'review', chapter: '第二章', section: '', type: 'review' },
    ], progress)

    expect(nodes[0]).toMatchObject({
      label: '第二章',
      quizType: 'review',
      chapter: '第二章',
      section: '',
    })
    expect(nodes[0].children).toBeUndefined()
  })

  it('retains the raw empty chapter/section scope for uncategorized routes', () => {
    const nodes = buildSetDetailTreeNodes([
      { id: 'uncategorized', chapter: '', section: '', type: 'choice' },
    ], progress)

    expect(nodes[0]).toMatchObject({ label: '未分类', quizType: 'choice', chapter: '', section: '' })
  })
})
