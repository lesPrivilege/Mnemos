// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const readerCss = readFileSync(resolve(process.cwd(), 'src/reading/styles/reader.css'), 'utf8')

const mocks = vi.hoisted(() => ({
  settings: { [['font', 'Size'].join('')]: 14, lineHeight: 1.4, margins: 12 },
  updateReadingSettings: vi.fn(),
  goBack: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'doc-1' }),
  useNavigate: () => vi.fn(),
}))

vi.mock('../../lib/useBackButton', () => ({ useBackButton: () => ({ goBack: mocks.goBack }) }))
vi.mock('../../components/NotFoundPage', () => ({ default: () => <div>未找到</div> }))
vi.mock('../components/ReaderToolbar', () => ({
  default: ({ title, onBack }) => <div className="topbar"><button onClick={onBack} aria-label="返回">返回</button><span>{title}</span></div>,
}))
vi.mock('../components/ReaderPanels', () => ({
  TocPanel: () => null,
  HighlightsPanel: () => null,
  BookmarksPanel: () => null,
}))
vi.mock('../lib/storage', () => ({
  getDocument: () => ({ id: 'doc-1', title: '测试文档', format: 'md', scrollPct: 0 }),
  getDocumentContent: vi.fn(() => Promise.resolve('正文')),
  updateReadingProgress: vi.fn(),
  getReadingSettings: () => mocks.settings,
  updateReadingSettings: mocks.updateReadingSettings,
}))
vi.mock('../lib/renderDoc', () => ({
  renderDoc: vi.fn(() => Promise.resolve('<p>正文</p>')),
  extractToc: vi.fn(() => []),
}))
vi.mock('../lib/highlights', () => ({
  getHighlightsByDoc: () => [],
  addHighlight: vi.fn(),
  deleteHighlight: vi.fn(),
}))
vi.mock('../lib/highlightAnchor', () => ({ repaintHighlights: vi.fn() }))
vi.mock('../lib/bookmarks', () => ({
  getBookmarksByDoc: () => [],
  addBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))
vi.mock('../lib/stats', () => ({
  startSession: vi.fn(),
  endSession: vi.fn(),
  markDocCompleted: vi.fn(),
  touchSession: vi.fn(),
}))
vi.mock('../lib/exportHighlights', () => ({ exportHighlightsMd: vi.fn() }))
vi.mock('../../lib/utils', () => ({ downloadBlob: vi.fn() }))
vi.mock('../../components/Icons', () => ({ BackIcon: () => <span aria-hidden="true">‹</span> }))

import Reader from './Reader'

beforeEach(() => {
  mocks.settings = { [['font', 'Size'].join('')]: 14, lineHeight: 1.4, margins: 12 }
  mocks.updateReadingSettings.mockImplementation((patch) => {
    mocks.settings = { ...mocks.settings, ...patch }
    return mocks.settings
  })
})

afterEach(cleanup)

async function openSettings() {
  render(<Reader />)
  await waitFor(() => expect(document.querySelector('.reader-bottom button')).toBeTruthy())
  fireEvent.click(document.querySelector('.overflow-y-auto'))
  const settingsButton = [...document.querySelectorAll('.reader-bottom button')].find(button => button.textContent === '设置')
  fireEvent.click(settingsButton)
  const settings = await screen.findByRole('group', { name: '字号' })
  return settings.closest('.reader-settings')
}

describe('Reader reading controls', () => {
  it('keeps six named steppers at 44px and fits the settings grid', async () => {
    const settings = await openSettings()
    const groups = screen.getAllByRole('group')
    expect(groups.map(group => group.getAttribute('aria-label'))).toEqual(['字号', '行距', '边距'])

    const steppers = screen.getAllByRole('button').filter(button => button.classList.contains('reader-stepper'))
    expect(steppers).toHaveLength(6)
    expect(readerCss).toMatch(/\.reader-stepper\s*\{[\s\S]*width: 44px;[\s\S]*height: 44px;/)
    expect(readerCss).toContain('min-height: 44px;')
    expect(settings.classList.contains('reader-settings')).toBe(true)
    expect(readerCss).toMatch(/\.reader-settings\s*\{[\s\S]*max-width: 100%;/)

    expect(screen.getByRole('button', { name: '减小字号' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '减小行距' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '减小边距' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '增大字号' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: '增大行距' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: '增大边距' }).disabled).toBe(false)
  })

  it('disables each increase at its maximum', async () => {
    await openSettings()
    for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByRole('button', { name: '增大字号' }))
    for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByRole('button', { name: '增大行距' }))
    for (let i = 0; i < 12; i += 1) fireEvent.click(screen.getByRole('button', { name: '增大边距' }))

    expect(screen.getByRole('button', { name: '增大字号' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '增大行距' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '增大边距' }).disabled).toBe(true)
    expect(screen.getByText('24', { selector: '.reader-setting-label .font-mono' })).toBeTruthy()
    expect(screen.getByText('2.2', { selector: '.reader-setting-label .font-mono' })).toBeTruthy()
    expect(screen.getByText('40', { selector: '.reader-setting-label .font-mono' })).toBeTruthy()
  })
})
