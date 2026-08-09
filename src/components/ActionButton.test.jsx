// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import { ActionButton } from './ActionButton'
import { ActionNotice, announceAction } from './ActionNotice'

/**
 * 动作四态之验（记-32）。
 *
 * 本组之要害不在按钮自身好不好看，而在**成功之信活不活得过表单的关闭**——
 * 三处调用点皆在 onAction 之内就把表单卸掉，故 done 一态从未落地。
 */

function Harness({ onAction, mounted = true, ...props }) {
  return (
    <>
      {mounted && (
        <ActionButton
          onAction={onAction}
          label="新建"
          pendingLabel="新建中"
          doneLabel="已新建"
          retryLabel="重试新建"
          {...props}
        />
      )}
      <ActionNotice />
    </>
  )
}

const notice = () => screen.getByRole('status').textContent
const button = () => screen.getByRole('button')

async function click() {
  await act(async () => {
    button().click()
  })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  announceAction(null)
  cleanup()
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('同步成功', () => {
  it('不加人为等待——一帧之内即成，确认语随之报出', async () => {
    const onAction = vi.fn(() => '已新建卡组「算法」')
    render(<Harness onAction={onAction} />)

    await click()

    expect(onAction).toHaveBeenCalledTimes(1)
    expect(notice()).toBe('已新建卡组「算法」')
    expect(button().textContent).toContain('已新建')
  })

  it('确认语出于按钮之外，故表单卸载後仍在', async () => {
    /* 三处调用点之实况：onAction 内关表单 → ActionButton 卸载。
       旧行为在此丢掉全部成功信号，本例即其回归锁。 */
    function Form() {
      const [open, setOpen] = useState(true)
      return (
        <Harness
          mounted={open}
          onAction={() => {
            setOpen(false)
            return '已新建卡组「算法」'
          }}
        />
      )
    }
    render(<Form />)

    await click()

    expect(screen.queryByRole('button')).toBeNull() // 表单已卸
    expect(notice()).toBe('已新建卡组「算法」') // 确认仍在
  })

  it('不返确认语者退用 doneLabel，不静默', async () => {
    render(<Harness onAction={() => {}} />)
    await click()
    expect(notice()).toBe('已新建')
  })
})

describe('异步成功', () => {
  it('真等待期间显示 pending 并挡住重复提交', async () => {
    let release
    const onAction = vi.fn(
      () => new Promise((resolve) => { release = () => resolve('已导入 42 道题') })
    )
    render(<Harness onAction={onAction} />)

    await click()
    expect(button().textContent).toContain('新建中')
    expect(button().disabled).toBe(true)
    expect(button().getAttribute('aria-busy')).toBe('true')
    expect(notice()).toBe('') // 未成之前不报成

    await click() // 等待中再点
    expect(onAction).toHaveBeenCalledTimes(1)

    await act(async () => { release() })
    expect(notice()).toBe('已导入 42 道题')
    expect(button().disabled).toBe(false)
  })
})

describe('重复点击', () => {
  it('同步动作连点两下只跑一次——闸在 ref 上，不在 state 上', async () => {
    const onAction = vi.fn(() => '已新建')
    render(<Harness onAction={onAction} />)

    await act(async () => {
      const btn = button()
      btn.click()
      btn.click()
    })

    expect(onAction).toHaveBeenCalledTimes(1)
  })
})

describe('失败与重试', () => {
  it('缘由以 alert 出，标签转为下一步，按钮可再按', async () => {
    const onAction = vi.fn()
      .mockRejectedValueOnce(new Error('卡组名称不能为空。'))
      .mockResolvedValueOnce('已新建卡组「算法」')
    render(<Harness onAction={onAction} />)

    await click()
    expect(screen.getByRole('alert').textContent).toBe('卡组名称不能为空。')
    expect(button().textContent).toContain('重试新建')
    expect(button().disabled).toBe(false)
    expect(notice()).toBe('') // 败不报确认

    await click()
    expect(notice()).toBe('已新建卡组「算法」')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('败则按钮不卸载，重试之处即焦点所在之处', async () => {
    render(<Harness onAction={() => { throw new Error('坏了') }} />)
    await act(async () => {
      button().focus()
      button().click()
    })
    expect(screen.queryByRole('button')).not.toBeNull()
    expect(document.activeElement).toBe(button())
  })
})

describe('卸载', () => {
  it('done 之驻留计时随卸载而清', async () => {
    const { unmount } = render(<Harness onAction={() => '成了'} />)
    await click()

    const before = vi.getTimerCount() // 按钮之驻留计时 + 确认语之驻留计时
    unmount()
    expect(vi.getTimerCount()).toBe(before - 1)
  })
})

describe('ActionNotice 活区', () => {
  it('空时仍在 DOM 内——活区须先在後变方得宣读', () => {
    render(<ActionNotice />)
    const region = screen.getByRole('status')
    expect(region.getAttribute('aria-live')).toBe('polite')
    expect(region.getAttribute('aria-atomic')).toBe('true')
    expect(region.textContent).toBe('')
  })

  it('驻留逾时後自撤', async () => {
    render(<ActionNotice />)
    await act(async () => { announceAction('已导入 42 道题') })
    expect(notice()).toBe('已导入 42 道题')

    await act(async () => { vi.advanceTimersByTime(3999) })
    expect(notice()).toBe('已导入 42 道题')

    await act(async () => { vi.advanceTimersByTime(1) })
    expect(notice()).toBe('')
  })

  it('後一句盖前一句，前句之计时不误撤後句', async () => {
    render(<ActionNotice />)
    await act(async () => { announceAction('第一句') })
    await act(async () => { vi.advanceTimersByTime(3000) })
    await act(async () => { announceAction('第二句') })

    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(notice()).toBe('第二句') // 若前句计时未清，此处已空
  })
})
