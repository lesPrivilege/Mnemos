import { quarantine } from './quarantine'
import { S } from './strings'

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function isArray(value) {
  return Array.isArray(value)
}

function isQuotaError(err) {
  return err?.name === 'QuotaExceededError' || err?.code === 22
}

export function loadJson(key, fallback, validate = () => true) {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!validate(parsed)) throw new Error('Invalid format')
    return parsed
  } catch (err) {
    quarantine(key, raw, err)
    return fallback
  }
}

export function saveJson(key, value, { label } = {}) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (err) {
    if (isQuotaError(err)) {
      const detail = label || S.storage.genericUnsaved
      console.warn(`Storage full for key "${key}": ${detail}`)
      return { ok: false, error: S.storage.quotaFull(detail) }
    }
    throw err
  }
}

export function removeKey(key) {
  localStorage.removeItem(key)
}
