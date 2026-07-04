import { idbGet, idbSet } from './idb'
import { quarantine } from './quarantine'
import { removeKey } from './store'

const KV_STORE = 'kv'

const records = new Map()
const cache = new Map()
const pendingWrites = new Set()

let hydrated = false
let hydratePromise = null

function identity(value) {
  return value
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function fallbackFor(config) {
  return normalizeRecord(config, cloneJson(config.fallback))
}

function normalizeRecord(config, value) {
  const normalized = config.normalize(value)
  if (!config.validate(normalized)) {
    throw new Error('Invalid format')
  }
  return normalized
}

function parseRaw(config, raw) {
  try {
    if (typeof raw !== 'string') {
      throw new Error('Invalid raw storage value')
    }
    return { ok: true, value: normalizeRecord(config, JSON.parse(raw)) }
  } catch (err) {
    quarantine(config.key, String(raw), err)
    return { ok: false }
  }
}

function readLocalRaw(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

async function readIdbRaw(key) {
  try {
    return await idbGet(KV_STORE, key)
  } catch {
    return undefined
  }
}

// idbSet() resolves true/false based on the write request's own outcome, so
// that result is what tells us whether it's safe to delete the localStorage
// copy of a big record — no separate read-back needed.
function scheduleIdbSet(key, value) {
  const write = idbSet(KV_STORE, key, JSON.stringify(value))
    .then((confirmed) => {
      if (confirmed) removeKey(key)
      return confirmed
    })
    .catch(() => false)
  pendingWrites.add(write)
  write.finally(() => {
    pendingWrites.delete(write)
  })
  return write
}

async function hydrateFromLocal(config) {
  const raw = readLocalRaw(config.key)
  if (raw === null) {
    cache.set(config.key, fallbackFor(config))
    return
  }

  const parsed = parseRaw(config, raw)
  if (!parsed.ok) {
    cache.set(config.key, fallbackFor(config))
    return
  }

  cache.set(config.key, parsed.value)
  await scheduleIdbSet(config.key, parsed.value)
}

async function hydrateRecord(config) {
  const idbRaw = await readIdbRaw(config.key)
  if (idbRaw !== undefined) {
    const parsed = parseRaw(config, idbRaw)
    if (parsed.ok) {
      cache.set(config.key, parsed.value)
      return
    }
  }

  await hydrateFromLocal(config)
}

function requireRecord(key) {
  const config = records.get(key)
  if (!config) {
    throw new Error(`Unknown bigStore key: ${key}`)
  }
  return config
}

function requireHydrated() {
  if (!hydrated) {
    throw new Error('bigStore hydrate() must run before sync access')
  }
}

// `label` is unused now that setCached() has no error surface to describe,
// but it's kept on the config (and required from call sites) in case a
// future error-surface mechanism for IDB failures needs it in R5+.
export function registerBigRecord({ key, fallback, validate = () => true, normalize = identity, label }) {
  if (!key) {
    throw new Error('bigStore record key is required')
  }
  if (hydrated || hydratePromise) {
    throw new Error('bigStore records must be registered before hydrate()')
  }

  records.set(key, { key, fallback, validate, normalize, label })
  return key
}

export function hydrate() {
  if (hydratePromise) return hydratePromise

  hydratePromise = Promise.all([...records.values()].map(hydrateRecord)).then(() => {
    hydrated = true
  })

  return hydratePromise
}

export function getCached(key) {
  requireHydrated()
  requireRecord(key)
  return cloneJson(cache.get(key))
}

export function setCached(key, value) {
  requireHydrated()
  const config = requireRecord(key)
  const normalized = normalizeRecord(config, value)
  cache.set(key, normalized)
  scheduleIdbSet(key, normalized)
  // IDB writes are async fire-and-forget and localStorage is no longer
  // written here, so there's no synchronous failure mode left to report
  // (quota errors were a localStorage-only concept).
  return { ok: true }
}

export async function flushBigStoreWritesForTests() {
  await Promise.all([...pendingWrites])
}
