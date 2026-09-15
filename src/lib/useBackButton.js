import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useCallback, useRef } from 'react'
import { App } from '@capacitor/app'
import { closeTopOverlay } from './overlayStack'
import { isNative } from './platform'

const MATERIALS_PARENTS = {
  flashcard: '/?view=materials&kind=flashcard',
  quiz: '/?view=materials&kind=quiz',
  reading: '/?view=materials&kind=reading',
}

// Declarative canonical hierarchy. Session-like routes keep their object parent;
// each top-level material object returns to its own materials category.
const ROUTES = [
  ['/review/:id',           ({ id }) => `/deck/${id}`],
  ['/browse/:id',           ({ id }) => `/deck/${id}`],
  ['/deck/:id',             () => MATERIALS_PARENTS.flashcard],

  ['/quiz/:subject',        ({ subject }) => `/set/${subject}`],
  ['/quiz-review/:subject', ({ subject }) => `/set/${subject}`],
  ['/set/:subject',         () => MATERIALS_PARENTS.quiz],

  ['/reading/doc/:id',      (_params, query) => collectionParent(query)],
  ['/collection/:id',       () => MATERIALS_PARENTS.reading],

  ['/prompt-guide',         (_params, query) => promptGuideParent(query)],
  ['/import',               (_params, query) => importParent(query)],

  ['/activity',             () => '/'],
  ['/settings',             () => '/'],
  ['/wrong',                (_params, query) => subjectUtilityParent(query)],
  ['/starred',              (_params, query) => subjectUtilityParent(query)],
  ['/search',               () => '/'],
]

function normalizedSegments(pathname) {
  const normalized = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname
  return normalized.split('/')
}

function matchRoute(pattern, pathname) {
  const patternSegments = pattern.split('/')
  const pathSegments = normalizedSegments(pathname)
  if (patternSegments.length !== pathSegments.length) return null

  const params = {}
  for (let i = 0; i < patternSegments.length; i++) {
    const segment = patternSegments[i]
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = pathSegments[i]
    } else if (segment !== pathSegments[i]) {
      return null
    }
  }
  return params
}

function asSearchParams(search) {
  if (search instanceof URLSearchParams) return search
  return new URLSearchParams(search || '')
}

function encodedQueryValue(query, key) {
  const value = query.get(key)
  return value ? encodeURIComponent(value) : null
}

function collectionParent(query) {
  const collectionId = encodedQueryValue(query, 'col')
  return collectionId ? `/collection/${collectionId}` : MATERIALS_PARENTS.reading
}

function subjectUtilityParent(query) {
  const subject = encodedQueryValue(query, 'subject')
  return subject ? `/set/${subject}` : MATERIALS_PARENTS.quiz
}

function importParent(query) {
  // A deck-scoped import is subordinate to that deck, irrespective of its tab.
  const deckId = encodedQueryValue(query, 'deckId')
  if (deckId) return `/deck/${deckId}`

  switch (query.get('tab')) {
    case 'md':
      return MATERIALS_PARENTS.flashcard
    case 'reading':
      return MATERIALS_PARENTS.reading
    case 'restore':
      return '/settings'
    case 'json':
    default:
      // Import's own default tab is JSON (quiz), including a cold /import deep link.
      return MATERIALS_PARENTS.quiz
  }
}

function promptGuideParent(query) {
  const guideTab = query.get('tab')
  const importQuery = new URLSearchParams()
  importQuery.set('tab', guideTab === 'quiz' ? 'json' : guideTab === 'reading' ? 'reading' : 'md')

  // Preserve deck scope if a future/contextual guide link supplies it.
  const deckId = query.get('deckId')
  if (deckId) importQuery.set('deckId', deckId)

  return `/import?${importQuery.toString()}`
}

function isSafeInternalReturnTo(returnTo) {
  return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
}

/**
 * Resolve a deterministic parent without consulting browser history.
 * A verified in-app source may override the canonical hierarchy; untrusted or
 * absent state falls back to a stable parent suitable for cold-start deep links.
 */
export function resolveParent(pathname, search = '', returnTo = null) {
  if (isSafeInternalReturnTo(returnTo)) return returnTo

  const query = asSearchParams(search)
  for (const [pattern, parentFor] of ROUTES) {
    const params = matchRoute(pattern, pathname)
    if (params) return parentFor(params, query)
  }

  return pathname === '/' ? null : '/'
}

export function useBackButton({ canLeave } = {}) {
  const canLeaveRef = useRef(canLeave)
  canLeaveRef.current = canLeave
  const navigate = useNavigate()
  const { pathname, search, state } = useLocation()
  const parent = resolveParent(pathname, search, state?.returnTo)

  // Use refs so the native listener (registered once) always reads current values
  const parentRef = useRef(parent)
  parentRef.current = parent
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const goBack = useCallback(() => {
    if (canLeaveRef.current && !canLeaveRef.current()) return
    if (parent) {
      navigate(parent)
    }
  }, [parent, navigate])

  useEffect(() => {
    if (!isNative()) return

    let removed = false
    let handle = null

    App.addListener('backButton', () => {
      if (removed) return
      if (closeTopOverlay()) return
      if (canLeaveRef.current && !canLeaveRef.current()) return
      const p = parentRef.current
      if (p) {
        navigateRef.current(p)
      } else {
        App.exitApp()
      }
    }).then(h => {
      if (!removed) handle = h
    })

    return () => {
      removed = true
      if (handle) handle.remove()
    }
  }, []) // register once — refs keep values current

  return { goBack, parent }
}
