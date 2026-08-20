import { describe, expect, it } from 'vitest'
import { resolveParent } from './useBackButton'

describe('resolveParent', () => {
  it.each([
    ['/deck/deck-1', '', '/?view=materials&kind=flashcard'],
    ['/set/math', '', '/?view=materials&kind=quiz'],
    ['/collection/books', '', '/?view=materials&kind=reading'],
    ['/deck/deck-1/', '', '/?view=materials&kind=flashcard'],
  ])('returns a material object to its canonical category: %s', (pathname, search, expected) => {
    expect(resolveParent(pathname, search)).toBe(expected)
  })

  it.each([
    ['/review/deck-1', '', '/deck/deck-1'],
    ['/browse/deck-1', '?sort=chapter', '/deck/deck-1'],
    ['/quiz/math', '', '/set/math'],
    ['/quiz-review/math', '?from=wrong', '/set/math'],
    ['/reading/doc/doc-1', '?col=collection-1', '/collection/collection-1'],
    ['/reading/doc/doc-1', '', '/?view=materials&kind=reading'],
  ])('keeps session and reader hierarchy deterministic: %s%s', (pathname, search, expected) => {
    expect(resolveParent(pathname, search)).toBe(expected)
  })

  it('encodes query-derived object identifiers before placing them in a path', () => {
    expect(resolveParent('/reading/doc/doc-1', '?col=East%20Asia%2F2026')).toBe('/collection/East%20Asia%2F2026')
    expect(resolveParent('/wrong', '?subject=data%20science%2Fml')).toBe('/set/data%20science%2Fml')
    expect(resolveParent('/starred', '?subject=R%26D')).toBe('/set/R%26D')
  })

  it('round-trips an encoded free-form subject through object and session parents', () => {
    const subject = encodeURIComponent('data science/ml')
    expect(resolveParent(`/set/${subject}`)).toBe('/?view=materials&kind=quiz')
    expect(resolveParent(`/quiz/${subject}`)).toBe(`/set/${subject}`)
  })

  it.each([
    ['?deckId=deck-1&tab=md', '/deck/deck-1'],
    ['?tab=md', '/?view=materials&kind=flashcard'],
    ['?tab=json', '/?view=materials&kind=quiz'],
    ['?tab=reading', '/?view=materials&kind=reading'],
    ['?tab=restore', '/settings'],
    ['', '/?view=materials&kind=quiz'],
  ])('resolves import context %s', (search, expected) => {
    expect(resolveParent('/import', search)).toBe(expected)
  })

  it.each([
    ['', '/import?tab=md'],
    ['?tab=general', '/import?tab=md'],
    ['?tab=vocab', '/import?tab=md'],
    ['?tab=quiz', '/import?tab=json'],
    ['?tab=reading', '/import?tab=reading'],
    ['?tab=reading&deckId=deck%201', '/import?tab=reading&deckId=deck+1'],
  ])('preserves prompt-guide import context %s', (search, expected) => {
    expect(resolveParent('/prompt-guide', search)).toBe(expected)
  })

  it('prefers a verified in-app source, including its query', () => {
    expect(resolveParent('/deck/deck-1', '', '/?view=materials&kind=reading')).toBe('/?view=materials&kind=reading')
    expect(resolveParent('/import', '?tab=json', '/set/math?filter=wrong')).toBe('/set/math?filter=wrong')
  })

  it.each([
    'https://example.com/steal',
    '//example.com/steal',
    'javascript:alert(1)',
    '',
    null,
    { pathname: '/settings' },
  ])('rejects an unsafe or malformed returnTo value: %s', (returnTo) => {
    expect(resolveParent('/deck/deck-1', '', returnTo)).toBe('/?view=materials&kind=flashcard')
  })

  it('gives cold-start utilities and unknown routes stable canonical parents', () => {
    expect(resolveParent('/wrong')).toBe('/?view=materials&kind=quiz')
    expect(resolveParent('/starred')).toBe('/?view=materials&kind=quiz')
    expect(resolveParent('/not-a-real-route', '?anything=1')).toBe('/')
    expect(resolveParent('/')).toBeNull()
  })
})
