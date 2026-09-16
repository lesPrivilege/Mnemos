// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import StudyTray from './StudyTray'
import { loadPlan, planKey, savePlan } from '../lib/studyPlan'
vi.mock('../lib/studyCatalog', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, studyCatalog: () => [{ kind: 'deck', id: 'd', title: '代数', label: '卡组', route: '/deck/d' }, { kind: 'document', id: 'r', title: '阅读', label: '文档', route: '/reading/doc/r' }] }
})
beforeEach(() => { const map = new Map(); vi.stubGlobal('localStorage', { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) }) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function Destination() { const location = useLocation(); return <p>已打开 {location.pathname}</p> }
function mount() { return render(<MemoryRouter><Routes><Route path="/" element={<StudyTray/>}/><Route path="/reading/doc/:id" element={<Destination/>}/></Routes></MemoryRouter>) }
it('selects several materials, reorders using buttons, and persists the chosen continue identity', () => {
  mount()
  fireEvent.click(screen.getByRole('button', { name: '加入资料' }))
  for (const input of screen.getAllByRole('checkbox')) fireEvent.click(input)
  fireEvent.click(screen.getByRole('button', { name: '加入 2 项' }))
  expect(loadPlan().items).toHaveLength(2)
  fireEvent.click(screen.getByText('展开顺序'))
  fireEvent.click(screen.getByRole('button', { name: '上移 阅读' }))
  expect(loadPlan().items[0].kind).toBe('document')
  fireEvent.click(screen.getAllByRole('button', { name: '从此处继续' })[0])
  expect(loadPlan().cursor).toBe(planKey({ kind: 'document', id: 'r' }))
  expect(screen.getByText('已打开 /reading/doc/r')).not.toBeNull()
})
it('does not silently advance past an unavailable current item', () => {
  savePlan({ items: [{ kind: 'deck', id: 'gone' }, { kind: 'document', id: 'r' }] })
  mount()
  expect(screen.getByRole('button', { name: '继续', exact: true }).disabled).toBe(true)
  expect(screen.getByText('当前：gone（不可用）')).not.toBeNull()
})

it('moves only an active local drag and keeps the current identity', () => {
  savePlan({ items: [{ kind: 'deck', id: 'd' }, { kind: 'document', id: 'r' }] })
  mount()
  fireEvent.click(screen.getByText('展开顺序'))
  const handle = screen.getByRole('button', { name: '拖动 阅读' })
  const target = screen.getByRole('button', { name: '拖动 代数' }).closest('li')
  fireEvent.drop(target)
  expect(loadPlan().items[0].kind).toBe('deck')
  const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
  fireEvent.dragStart(handle, { dataTransfer })
  expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', planKey({ kind: 'document', id: 'r' }))
  fireEvent.drop(target)
  expect(loadPlan().items[0].kind).toBe('document')
  expect(loadPlan().cursor).toBe(planKey({ kind: 'deck', id: 'd' }))
  expect(document.activeElement).toBe(handle.closest('li'))
})
