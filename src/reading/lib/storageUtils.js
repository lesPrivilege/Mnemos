// Shared localStorage helpers for reading module
// All reading storage files should import from here
import { loadJson, saveJson } from '../../lib/store'
import { S } from '../../lib/strings'

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
  return loadJson(key, fallback, (value) => matchesFallbackShape(value, fallback))
}

/**
 * Save JSON to localStorage with error handling
 */
export function save(key, data) {
  const result = saveJson(key, data, { label: S.readingStorage.unsaved(key) })
  if (result.ok && key !== READING_SCHEMA_VERSION_KEY) writeSchemaVersion()
}
