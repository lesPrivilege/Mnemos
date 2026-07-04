// Mid-review session persistence
// Saved on Review unmount, cleared on completion or explicit dismiss.
// Simple: only saves deck identity + count — enough to show a "continue" card.
// Actual queue is re-pulled via getDueCards() on resume (SM-2 scores are already persisted).

import { isPlainObject, loadJson, removeKey, saveJson } from './store'
import { S } from './strings'

const KEY = 'mnemos-review-session'

export function saveReviewSession(session) {
  saveJson(KEY, { ...session, savedAt: Date.now() }, { label: S.reviewSession.unsaved })
}

export function loadReviewSession() {
  const s = loadJson(KEY, null, (value) => value === null || isPlainObject(value))
  if (!s) return null
  // Expire after 24h — stale sessions are misleading
  if (Date.now() - s.savedAt > 86400000) {
    clearReviewSession()
    return null
  }
  return s
}

export function clearReviewSession() {
  removeKey(KEY)
}
