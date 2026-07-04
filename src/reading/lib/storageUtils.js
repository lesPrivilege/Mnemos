// Shared localStorage helpers for reading module
// All reading storage files should import from here
import { quarantine } from '../../lib/quarantine'

export const READING_SCHEMA_VERSION = 1
export const READING_SCHEMA_VERSION_KEY = 'reading-schema-version'

function matchesFallbackShape(value, fallback) {
  if (Array.isArray(fallback)) return Array.isArray(value)
  if (fallback && typeof fallback === 'object') {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }
  return true
}

function writeSchemaVersion() {
  try {
    localStorage.setItem(READING_SCHEMA_VERSION_KEY, String(READING_SCHEMA_VERSION))
  } catch {
    // The marker is advisory for future migrations and must not block data saves.
  }
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
    if (key !== READING_SCHEMA_VERSION_KEY) writeSchemaVersion()
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      console.warn(`Reading: storage full for key "${key}"`)
    } else {
      throw e
    }
  }
}
