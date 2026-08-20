// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StructureTree from './StructureTree'

afterEach(cleanup)

const tiers = { weak: 0, mid: 0, solid: 0, new: 1 }

describe('StructureTree semantics', () => {
  it('uses nested lists and collapses through a real disclosure button', () => {
    render(
      <StructureTree
        nodes={[{
          id: 'chapter-1', label: '第一章', count: 1, tiers,
          children: [{ id: 'section-1', label: '第一节', count: 1, tiers, quizType: 'choice' }],
        }]}
        onLeafTap={vi.fn()}
      />
    )

    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.queryByRole('tree')).toBeNull()
    expect(screen.queryByRole('treeitem')).toBeNull()
    const chapter = screen.getByRole('button', { name: /第一章/ })
    expect(chapter.getAttribute('aria-expanded')).toBe('true')
    expect(chapter.getAttribute('aria-controls')).toMatch(/^structure-tree-group-/)

    fireEvent.click(chapter)
    expect(chapter.getAttribute('aria-expanded')).toBe('false')
    const controlledList = document.getElementById(chapter.getAttribute('aria-controls'))
    expect(controlledList).toBeTruthy()
    expect(controlledList?.hidden).toBe(true)
    expect(screen.getAllByRole('list')).toHaveLength(1)
  })

  it('activates a leaf through its native button', () => {
    const onLeafTap = vi.fn()
    render(
      <StructureTree
        nodes={[{ id: 'chapter-1', label: '第一章', count: 1, tiers, quizType: 'review' }]}
        onLeafTap={onLeafTap}
      />
    )

    const leaf = screen.getByRole('button', { name: /第一章/ })
    expect(leaf.getAttribute('aria-expanded')).toBeNull()
    expect(leaf.getAttribute('type')).toBe('button')
    fireEvent.click(leaf)
    expect(onLeafTap).toHaveBeenCalledWith(expect.objectContaining({ quizType: 'review' }))
  })
})
