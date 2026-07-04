import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseMdToCards } from './mdParser'

describe('parseMdToCards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 3, 9))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses headings, bullets, and body continuations into recall cards', () => {
    const { cards, deckName } = parseMdToCards(
      [
        '# Biology',
        '## Cells',
        '### Organelles',
        '- Mitochondria',
        '  ATP powerhouse',
        'Plain text continuation',
      ].join('\n'),
      'Fallback'
    )

    expect(deckName).toBe('Biology')
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      front: 'Mitochondria',
      back: 'ATP powerhouse\nPlain text continuation',
      type: 'recall',
      chapter: 'Cells',
      section: 'Organelles',
      easiness: 2.5,
      interval: 0,
      repetitions: 0,
      dueDate: '2026-05-03',
    })
  })

  it('falls back to loose inline front/back pairs', () => {
    const { cards } = parseMdToCards('Capital of France: Paris', 'Geography')

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      front: 'Capital of France',
      back: 'Paris',
      chapter: 'Geography',
      section: '',
    })
  })

  it('cleans prompt prefixes in loose Q/A blocks', () => {
    const { cards } = parseMdToCards(['Q: 2 + 2', 'A: 4'].join('\n'), 'Math')

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      front: '2 + 2',
      back: '4',
      chapter: 'Math',
    })
  })
})
