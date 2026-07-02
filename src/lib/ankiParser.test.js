import { describe, it, expect } from 'vitest'
import { parseRecords, parseHeader, resolveSeparator, sniffSeparator, decodeEntities, htmlToMarkdown, looksLikeHtml, hasCloze, clozeToFrontBack, processField, splitDeck, parseAnkiToCards } from './ankiParser'

describe('parseRecords', () => {
  it('splits simple TSV into records', () => {
    expect(parseRecords('a\tb\nc\td', '\t')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('ignores a trailing newline', () => {
    expect(parseRecords('a\tb\n', '\t')).toEqual([['a', 'b']])
  })
  it('honors a comma separator', () => {
    expect(parseRecords('a,b', ',')).toEqual([['a', 'b']])
  })
  it('keeps the separator inside quoted fields', () => {
    expect(parseRecords('"a, b",c', ',')).toEqual([['a, b', 'c']])
  })
  it('unescapes doubled quotes', () => {
    expect(parseRecords('"say ""hi""",x', ',')).toEqual([['say "hi"', 'x']])
  })
  it('keeps newlines inside quoted fields', () => {
    expect(parseRecords('"l1\nl2"\tb', '\t')).toEqual([['l1\nl2', 'b']])
  })
  it('treats quotes not at field start as literal (HTML attrs)', () => {
    expect(parseRecords('<img src="x">\tb', '\t')).toEqual([['<img src="x">', 'b']])
  })
})

describe('parseHeader', () => {
  it('extracts directives and strips them from the data body', () => {
    const { config, dataText } = parseHeader('#separator:tab\n#html:true\nQ\tA')
    expect(config.separator).toBe('tab')
    expect(config.html).toBe(true)
    expect(dataText).toBe('Q\tA')
  })
  it('parses column directives as 1-indexed numbers', () => {
    const { config } = parseHeader('#deck column:3\n#tags column:5\nx')
    expect(config.deckCol).toBe(3)
    expect(config.tagsCol).toBe(5)
  })
  it('leaves html null when no directive is present', () => {
    const { config, dataText } = parseHeader('Q\tA')
    expect(config.html).toBe(null)
    expect(dataText).toBe('Q\tA')
  })
})

describe('resolveSeparator', () => {
  it('maps named separators (case-insensitive)', () => {
    expect(resolveSeparator('tab')).toBe('\t')
    expect(resolveSeparator('comma')).toBe(',')
    expect(resolveSeparator('Pipe')).toBe('|')
  })
  it('returns null when empty', () => {
    expect(resolveSeparator(null)).toBe(null)
  })
})

describe('sniffSeparator', () => {
  it('prefers tab, then comma, else defaults to tab', () => {
    expect(sniffSeparator('a\tb')).toBe('\t')
    expect(sniffSeparator('a,b')).toBe(',')
    expect(sniffSeparator('plain')).toBe('\t')
  })
})

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('a &amp; b &lt;x&gt; &#65;')).toBe('a & b <x> A')
  })
})

describe('htmlToMarkdown', () => {
  it('converts bold and italic', () => {
    expect(htmlToMarkdown('<b>B</b> <i>I</i>')).toBe('**B** *I*')
  })
  it('converts br to newline', () => {
    expect(htmlToMarkdown('a<br>b')).toBe('a\nb')
  })
  it('replaces img with a text placeholder', () => {
    expect(htmlToMarkdown('<img src="cat.jpg">x')).toBe('[图片: cat.jpg]x')
  })
  it('strips unknown tags but keeps their text', () => {
    expect(htmlToMarkdown('<span class="c">hi</span>')).toBe('hi')
  })
})

describe('looksLikeHtml', () => {
  it('detects tags vs plain text', () => {
    expect(looksLikeHtml('<b>x</b>')).toBe(true)
    expect(looksLikeHtml('plain')).toBe(false)
  })
})

describe('cloze', () => {
  it('detects cloze markers', () => {
    expect(hasCloze('x {{c1::y}}')).toBe(true)
    expect(hasCloze('plain')).toBe(false)
  })
  it('hides answer on front, reveals on back, using hint when given', () => {
    expect(clozeToFrontBack('Capital is {{c1::Paris::city}}.')).toEqual({
      front: 'Capital is [city].',
      back: 'Capital is Paris.',
    })
  })
  it('uses an ellipsis placeholder when no hint', () => {
    expect(clozeToFrontBack('{{c1::Paris}}')).toEqual({ front: '[…]', back: 'Paris' })
  })
})

describe('processField', () => {
  it('trims plain text when not html', () => {
    expect(processField('  hi  ', false)).toEqual({ text: 'hi', images: 0 })
  })
  it('converts html and counts images', () => {
    expect(processField('<b>x</b><img src="a.png">', true)).toEqual({
      text: '**x**[图片: a.png]',
      images: 1,
    })
  })
})

describe('splitDeck', () => {
  it('maps a single deck to chapter', () => {
    expect(splitDeck('Geo')).toEqual({ chapter: 'Geo', section: '' })
  })
  it('maps a deck hierarchy to chapter/section', () => {
    expect(splitDeck('Geo::Europe::France')).toEqual({ chapter: 'Geo', section: 'Europe · France' })
  })
})

describe('parseAnkiToCards', () => {
  it('parses headerless TSV with the fallback chapter = deckName', () => {
    const { cards } = parseAnkiToCards('F1\tB1\nF2\tB2', 'MyDeck')
    expect(cards).toEqual([
      { front: 'F1', back: 'B1', type: 'recall', chapter: 'MyDeck', section: '' },
      { front: 'F2', back: 'B2', type: 'recall', chapter: 'MyDeck', section: '' },
    ])
  })
  it('maps a deck column to chapter/section and suggests a deck name', () => {
    const r = parseAnkiToCards('#separator:tab\n#deck column:3\nQ\tA\tGeo::Europe', 'X')
    expect(r.cards[0]).toMatchObject({ chapter: 'Geo', section: 'Europe' })
    expect(r.deckName).toBe('Geo')
  })
  it('drops a tags column and counts the tags', () => {
    const r = parseAnkiToCards('#separator:tab\n#tags column:3\nQ\tA\tt1 t2', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'Q', back: 'A' })
    expect(r.stats.tagsDropped).toBe(2)
  })
  it('converts html fields to markdown', () => {
    const r = parseAnkiToCards('#separator:tab\n#html:true\n<b>Q</b>\t<i>A</i>', 'X')
    expect(r.cards[0]).toMatchObject({ front: '**Q**', back: '*A*' })
  })
  it('converts a cloze note and counts it', () => {
    const r = parseAnkiToCards('#separator:tab\n#html:false\nCapital is {{c1::Paris}}.', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'Capital is […].', back: 'Capital is Paris.' })
    expect(r.stats.cloze).toBe(1)
  })
  it('joins extra content fields into the back', () => {
    const r = parseAnkiToCards('a\tb\tc', 'X')
    expect(r.cards[0]).toMatchObject({ front: 'a', back: 'b\n\nc' })
  })
  it('returns no cards for empty input', () => {
    expect(parseAnkiToCards('', 'X').cards).toEqual([])
  })
  it('skips blank records and counts them', () => {
    const r = parseAnkiToCards('Q\tA\n\t\nQ2\tA2', 'X')
    expect(r.cards).toHaveLength(2)
    expect(r.stats.skipped).toBe(1)
  })
})
