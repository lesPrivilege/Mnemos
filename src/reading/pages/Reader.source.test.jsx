// @vitest-environment jsdom
import { webcrypto } from 'node:crypto'
import { IDBFactory } from 'fake-indexeddb'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Reader from './Reader'
import Browse from '../../pages/Browse'
import { hydrate, flushBigStoreWritesForTests } from '../../lib/bigStore'
import { getCards, getDecks } from '../../lib/storage'
import { addDocument } from '../lib/storage'
import * as idb from '../../lib/idb'

afterEach(async () => { cleanup(); await flushBigStoreWritesForTests(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('creates a sourced card from the second quote, retries a failed transaction, then returns from its source without changing the card', async () => {
  const local = new Map()
  vi.stubGlobal('localStorage', { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, String(value)), removeItem: key => local.delete(key), key: index => [...local.keys()][index], get length() { return local.size } })
  vi.stubGlobal('indexedDB', new IDBFactory()); vi.stubGlobal('crypto', webcrypto)
  Range.prototype.getBoundingClientRect = () => ({ left: 20, right: 200, top: 100, bottom: 130 })
  Element.prototype.scrollIntoView = vi.fn()
  await hydrate()
  const doc = await addDocument(null, '重复句材料', '# 资料\n\n第一处。\n\n重复句。\n\n第二处。\n\n重复句。')
  render(<MemoryRouter initialEntries={[`/reading/doc/${doc.id}`]}><Routes><Route path="/reading/doc/:id" element={<Reader/>}/><Route path="/browse/:id" element={<Browse/>}/></Routes></MemoryRouter>)
  const repeated = await screen.findAllByText('重复句。')
  const range = document.createRange()
  range.selectNodeContents(repeated[1]); window.getSelection().addRange(range)
  fireEvent.mouseUp(repeated[1])
  fireEvent.click(await screen.findByRole('button', { name: '制成卡片', exact: true }))
  fireEvent.change(await screen.findByLabelText('问题'), { target: { value: '第二处讲了什么？' } })
  const write = vi.spyOn(idb, 'idbSet').mockResolvedValueOnce(false)
  fireEvent.click(screen.getByRole('button', { name: '保存卡片' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByLabelText('问题').value).toBe('第二处讲了什么？')
  write.mockRestore()
  fireEvent.click(screen.getByRole('button', { name: '重试保存' }))
  fireEvent.click(await screen.findByRole('link', { name: '查看卡片' }))
  const card = getCards(getDecks()[0].id)[0]
  expect(card.source.id).toBe(doc.id)
  expect(card.source.textOffset).toBeGreaterThan(10)
  fireEvent.click(await screen.findByRole('button', { name: '查看原文' }))
  await waitFor(() => expect(document.querySelector('.source-lens article')).toBeTruthy())
  expect(document.activeElement.previousElementSibling.textContent).toBe('第二处。')
  fireEvent.click(screen.getByRole('button', { name: '返回卡片' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(getCards(card.deckId)).toHaveLength(1)
  expect(getCards(card.deckId)[0]).toEqual(card)
})
