const INDEX_KEY = 'mnemos-quarantine-index'
const ENTRY_PREFIX = 'mnemos-quarantine::'

function entryKey(key) {
  return `${ENTRY_PREFIX}${key}`
}

function byteSize(value) {
  const text = String(value ?? '')
  if (typeof Blob !== 'undefined') return new Blob([text]).size
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length
  return text.length
}

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((key) => typeof key === 'string') : []
  } catch {
    return []
  }
}

function writeIndex(keys) {
  localStorage.setItem(INDEX_KEY, JSON.stringify([...new Set(keys)]))
}

function readEntry(key) {
  const raw = localStorage.getItem(entryKey(key))
  if (!raw) return null
  const parsed = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object' || typeof parsed.raw !== 'string') return null
  return parsed
}

export function quarantine(key, raw, err) {
  try {
    const record = {
      raw: String(raw ?? ''),
      quarantinedAt: new Date().toISOString(),
      error: err?.message || String(err || 'Unknown storage error'),
    }
    localStorage.setItem(entryKey(key), JSON.stringify(record))

    const index = readIndex()
    if (!index.includes(key)) {
      index.push(key)
      writeIndex(index)
    }
  } catch {
    // Quarantine is a last-ditch safety net and must never break app boot.
  }
}

export function listQuarantined() {
  const entries = []
  for (const key of readIndex()) {
    try {
      const entry = readEntry(key)
      if (!entry) continue
      entries.push({
        key,
        quarantinedAt: entry.quarantinedAt || '',
        error: entry.error || '',
        size: byteSize(entry.raw),
      })
    } catch {
      // Ignore malformed quarantine records; the original app data path has already recovered.
    }
  }
  return entries
}

export function getQuarantinedRaw(key) {
  try {
    return readEntry(key)?.raw ?? null
  } catch {
    return null
  }
}

export function discardQuarantined(key) {
  try {
    localStorage.removeItem(entryKey(key))
    writeIndex(readIndex().filter((item) => item !== key))
  } catch {
    // Discard failure should not block the user from continuing to use the app.
  }
}
