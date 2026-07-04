// Shared localStorage helpers for reading module
// All reading storage files should import from here
import { quarantine } from '../../lib/quarantine'

function matchesFallbackShape(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value)
  if (fallback && typeof fallback === 'object') {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }
  return true
}

/**
 * Load JSON from localStorage with fallback
 */
export function load(key, fallback) {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!matchesFallbackShape(parsed, fallback)) throw new Error('Invalid format')
    return parsed
  } catch (e) {
    quarantine(key, raw, e)
    return fallback
  }
}

/**
 * Save JSON to localStorage with error handling
 */
export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn(`Reading: storage full for key "${key}"`)
    } else {
      throw e
    }
  }
}
