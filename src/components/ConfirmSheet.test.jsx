// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useRef, useState } from 'react'
import { ConfirmSheet, useConfirm } from './ConfirmSheet'

function Harness() {
  const { confirmState, confirm } = useConfirm()
  return (
    <>
      <button onClick={() => confirm({ title: '确认删除', message: '确定吗？' })}>打开确认</button>
      <ConfirmSheet state={confirmState} />
    </>
  )
}

function MenuConfirmHarness() {
  const { confirmState, confirm } = useConfirm()
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef(null)

  const handleDelete = () => {
    setMenuOpen(false)
    confirm({ title: '确认删除', message: '确定吗？', returnFocus: triggerRef.current })
  }

  return (
    <>
      <button ref={triggerRef} onClick={() => setMenuOpen(value => !value)}>更多操作</button>
      {menuOpen && (
        <div role="group" aria-label="更多操作">
          <button onClick={handleDelete}>删除</button>
        </div>
      )}
      <ConfirmSheet state={confirmState} />
    </>
  )
}

function DisconnectedHarness() {
  const { confirmState, confirm } = useConfirm()
  const [showTrigger, setShowTrigger] = useState(true)
  const triggerRef = useRef(null)

  return (
    <>
      {showTrigger && <button ref={triggerRef} onClick={() => confirm({ title: '确认删除', returnFocus: triggerRef.current })}>打开确认</button>}
      <button onClick={() => setShowTrigger(false)}>移除触发器</button>
      <ConfirmSheet state={confirmState} />
    </>
  )
}

afterEach(() => {
  cleanup()
  document.getElementById('root')?.remove()
})

describe('ConfirmSheet overlay contract', () => {
  it('focuses the safe action, traps Tab, cancels on Escape, and restores focus', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<Harness />, { container: root })

    const trigger = screen.getByRole('button', { name: '打开确认' })
    trigger.focus()
    fireEvent.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: '确认删除' })
    const cancel = within(dialog).getByRole('button', { name: '取消' })
    const confirm = within(dialog).getByRole('button', { name: '确认' })
    expect(cancel.style.borderRadius).toBe('var(--r-md)')
    expect(confirm.style.borderRadius).toBe('var(--r-md)')
    await waitFor(() => expect(document.activeElement).toBe(cancel))
    expect(root.inert).toBe(true)

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(root.inert).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('uses the full backdrop as a cancel action', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<Harness />, { container: root })

    const trigger = screen.getByRole('button', { name: '打开确认' })
    trigger.focus()
    fireEvent.click(trigger)
    await screen.findByRole('dialog', { name: '确认删除' })
    fireEvent.click(document.querySelector('.confirm-backdrop'))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
  })

  it('unmounts a menu before opening the dialog and returns to its trigger', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<MenuConfirmHarness />, { container: root })

    const trigger = screen.getByRole('button', { name: '更多操作' })
    trigger.focus()
    fireEvent.click(trigger)
    const group = screen.getByRole('group', { name: '更多操作' })
    fireEvent.click(within(group).getByRole('button', { name: '删除' }))

    await waitFor(() => expect(screen.queryByRole('group', { name: '更多操作' })).toBeNull())
    expect(await screen.findByRole('dialog', { name: '确认删除' })).toBeTruthy()
    expect(root.inert).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(root.inert).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('does not attempt to focus a disconnected return target', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<DisconnectedHarness />, { container: root })

    const trigger = screen.getByRole('button', { name: '打开确认' })
    trigger.focus()
    fireEvent.click(trigger)
    await screen.findByRole('dialog', { name: '确认删除' })
    fireEvent.click(screen.getByRole('button', { name: '移除触发器' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.contains(trigger)).toBe(false)
  })
})
