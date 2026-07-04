// Reading bookmarks storage
import { load, save } from './storageUtils'
import { S } from '../../lib/strings'

const KEY = 'reading-bookmarks'

export function getBookmarksByDoc(docId) {
  return load(KEY, []).filter(b => b.docId === docId)
}

export function getAllBookmarks() {
  return load(KEY, [])
}

export function addBookmark(docId, scrollPct, title = '') {
  const bookmarks = load(KEY, [])
  const bookmark = {
    id: crypto.randomUUID(),
    docId,
    title: title || S.bookmarks.defaultTitle(scrollPct),
    scrollPct,
    createdAt: new Date().toISOString(),
  }
  bookmarks.push(bookmark)
  save(KEY, bookmarks)
  return bookmark
}

export function updateBookmark(id, fields) {
  const bookmarks = load(KEY, [])
  const b = bookmarks.find(x => x.id === id)
  if (b) Object.assign(b, fields)
  save(KEY, bookmarks)
  return b
}

export function deleteBookmark(id) {
  save(KEY, load(KEY, []).filter(b => b.id !== id))
}
