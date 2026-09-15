// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import Search from './Search'
vi.mock('../lib/storage', () => ({ getDecks: () => [{ id: 'd', name: 'D' }], getCards: id => id === 'd' ? [{ id: 'c', deckId: 'd', front: '面积卡片', back: '乘积' }] : [] }))
vi.mock('../quiz/lib/storage', () => ({ loadQuestions: () => [{ id: 'q', subject: '线性/代数', type: 'choice', question: '面积题目' }] }))
vi.mock('../reading/lib/storage', () => ({ getDocuments: () => [{ id: 'doc', title: '面积文档' }] }))
vi.mock('../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: vi.fn() }) }))
afterEach(cleanup)
function Destination() { const location = useLocation(); return <p>{location.state?.returnTo}</p> }
function mount(url = '/search') { return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/search" element={<Search/>}/><Route path="/browse/:id" element={<Destination/>}/><Route path="/reading/doc/:id" element={<Destination/>}/></Routes></MemoryRouter>) }
it('restores query, finds all object types, and links a card to its exact ID with search return', () => {
  mount('/search?q=面积')
  expect(screen.getByRole('textbox').value).toBe('面积')
  expect(screen.getAllByRole('link')).toHaveLength(3)
  expect(screen.getByRole('link', { name: /面积题目/ }).getAttribute('href')).toBe('/quiz/%E7%BA%BF%E6%80%A7%2F%E4%BB%A3%E6%95%B0?qid=q')
  const card = screen.getByRole('link', { name: /面积卡片/ })
  expect(card.getAttribute('href')).toBe('/browse/d?card=c')
  fireEvent.click(card)
  expect(screen.getByText('/search?q=面积')).not.toBeNull()
})
it('does not search unfinished IME composition; filters document titles after commit', async () => {
  mount()
  const input = screen.getByRole('textbox')
  fireEvent.compositionStart(input)
  fireEvent.change(input, { target: { value: '面积' } })
  await new Promise(resolve => setTimeout(resolve, 350))
  expect(screen.queryAllByRole('link')).toHaveLength(0)
  fireEvent.compositionEnd(input)
  await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(3))
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'document' } })
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/reading/doc/doc')
  fireEvent.click(screen.getByRole('link'))
  expect(screen.getByText('/search?q=%E9%9D%A2%E7%A7%AF&kind=document')).not.toBeNull()
})
