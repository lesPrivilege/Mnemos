// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import EmptyState from './EmptyState'

afterEach(cleanup)

describe('EmptyState', () => {
  it('可承图记、居中版式与下一步行动', () => {
    const { container } = render(
      <EmptyState
        centered
        icon={<svg data-testid="empty-icon" />}
        title="还没有卡组"
        hint="从 Markdown 导入，或新建一个空卡组开始。"
      >
        <button type="button">新建卡组</button>
      </EmptyState>
    )

    expect(container.querySelector('.empty-centered')).not.toBeNull()
    expect(screen.getByTestId('empty-icon')).not.toBeNull()
    expect(screen.getByText('还没有卡组')).not.toBeNull()
    expect(screen.getByRole('button', { name: '新建卡组' })).not.toBeNull()
  })

  it('既有简式不添居中语义', () => {
    const { container } = render(<EmptyState title="暂无项目" hint="稍后再试。" />)

    expect(container.querySelector('.empty-centered')).toBeNull()
    expect(container.querySelector('.ic')).toBeNull()
  })
})
