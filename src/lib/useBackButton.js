import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useCallback, useRef } from 'react'
import { App } from '@capacitor/app'
import { isNative } from './platform'

// Declarative route hierarchy: [childPattern, parentPattern]
// Ordered: more specific routes first. :param segments match any value.
// To add a new route, append a [child, parent] pair — no logic changes needed.
const ROUTES = [
  ['/review/:id',          '/deck/:id'],
  ['/browse/:id',          '/deck/:id'],
  ['/deck/:id',            '/'],

  ['/quiz/:subject',       '/set/:subject'],
  ['/quiz-review/:subject','/set/:subject'],
  ['/set/:subject',        '/'],

  ['/reading/doc/:id',     '/collection/:id'],
  ['/collection/:id',      '/'],

  ['/prompt-guide',        '/import'],
  ['/import',              '/'],

  ['/activity',            '/'],
  ['/settings',            '/'],
  ['/wrong',               '/'],
  ['/starred',             '/'],
  ['/search',              '/'],
]

function matchRoute(pattern, pathname) {
  const segs = pattern.split('/')
  const paths = pathname.split('/')
  if (segs.length !== paths.length) return false
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].startsWith(':')) continue
    if (segs[i] !== paths[i]) return false
  }
  return true
}

function resolve(pattern, pathname) {
  return pattern.replace(/:(\w+)/g, (_, key) => {
    const idx = pattern.split('/').findIndex(s => s === `:${key}`)
    return pathname.split('/')[idx] || `:${key}`
  })
}

function getParent(pathname, searchParams) {
  for (const [child, parent] of ROUTES) {
    if (!matchRoute(child, pathname)) continue

    // Resolve :params in parent from current pathname
    let resolved = resolve(parent, pathname)

    // Special: /reading/doc/:id parent is /collection/:id — resolve from ?col= param
    if (parent === '/collection/:id') {
      const colId = searchParams.get('col')
      resolved = colId ? `/collection/${colId}` : '/?tab=reading'
    }

    // Special: /import?deckId=X → parent is /deck/X, not /
    if (child === '/import' && searchParams) {
      const deckId = searchParams.get('deckId')
      if (deckId) resolved = `/deck/${deckId}`
    }

    // Special: subject-scoped quiz utilities return to the subject detail.
    if ((child === '/wrong' || child === '/starred') && searchParams) {
      const subject = searchParams.get('subject')
      if (subject) resolved = `/set/${subject}`
    }

    return resolved
  }

  // Root or unknown → no parent
  return pathname === '/' ? null : '/'
}

export function useBackButton() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const searchParams = new URLSearchParams(search)
  const parent = getParent(pathname, searchParams)

  // Use refs so the native listener (registered once) always reads current values
  const parentRef = useRef(parent)
  parentRef.current = parent
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const goBack = useCallback(() => {
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
