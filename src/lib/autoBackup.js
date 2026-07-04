// Automatic local backup — daily snapshot to device filesystem.
// Native-only: every entry point early-returns when !isNative().
// Integration point: uses buildFullBackup (same cross-module permission as Settings.jsx).
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { isNative } from './platform'
import { buildFullBackup } from './fullBackup'
import { localToday } from './dateUtils'
import { isPlainObject, loadJson, saveJson } from './store'
import { S } from './strings'

const ENABLED_KEY = 'mnemos-auto-backup-enabled'
const STATUS_KEY = 'mnemos-last-auto-backup'
const BACKUP_DIR = 'Mnemos'
const MAX_BACKUPS = 7
const MIN_INTERVAL_MS = 20 * 60 * 60 * 1000 // 20 hours

function isEnabled() {
  const v = localStorage.getItem(ENABLED_KEY)
  return v === null ? true : v === 'true'
}

function getStatus() {
  return loadJson(STATUS_KEY, null, (value) => value === null || isPlainObject(value))
}

export function setStatus(status) {
  saveJson(STATUS_KEY, status, { label: S.autoBackup.statusUnsaved })
}

export function setEnabled(on) {
  localStorage.setItem(ENABLED_KEY, on ? 'true' : 'false')
}

export function getAutoBackupConfig() {
  return {
    enabled: isEnabled(),
    status: getStatus(),
  }
}

/**
 * Run auto-backup if conditions are met.
 * Called once from App.jsx useEffect. Schedules actual work with ~5s delay
 * so app startup isn't blocked.
 */
export function maybeRunAutoBackup() {
  if (!isNative()) return
  if (!isEnabled()) return

  const status = getStatus()
  if (status?.ok && Date.now() - status.at < MIN_INTERVAL_MS) return

  setTimeout(() => runBackup(false), 5000)
}

/**
 * Run backup immediately (bypasses 20h guard). Used by "立即备份" button.
 * @returns {Promise<{ok: boolean, error?: string, dir?: string, path?: string}>}
 */
export async function runBackupNow() {
  return runBackup(true)
}

async function runBackup(immediate) {
  if (!isNative()) return { ok: false, error: 'not native' }

  if (!immediate) {
    const status = getStatus()
    if (status?.ok && Date.now() - status.at < MIN_INTERVAL_MS) {
      return status
    }
  }

  let dir = Directory.Documents
  const fileName = `mnemos-auto-${localToday()}.json`
  const filePath = `${BACKUP_DIR}/${fileName}`

  try {
    const backup = await buildFullBackup()
    const json = JSON.stringify(backup, null, 2)

    try {
      await Filesystem.writeFile({ path: filePath, data: json, directory: dir, recursive: true, encoding: Encoding.UTF8 })
    } catch {
      // Fallback to Directory.Data if Documents fails (scoped-storage differences)
      dir = Directory.Data
      await Filesystem.writeFile({ path: filePath, data: json, directory: dir, recursive: true, encoding: Encoding.UTF8 })
    }

    const result = { at: Date.now(), ok: true, dir: dir === Directory.Documents ? 'Documents' : 'Data', path: filePath }
    setStatus(result)
    await pruneOldBackups(dir)
    return result
  } catch (e) {
    const result = { at: Date.now(), ok: false, error: e.message || String(e), dir: dir === Directory.Documents ? 'Documents' : 'Data', path: filePath }
    setStatus(result)
    return result
  }
}

async function pruneOldBackups(dir) {
  try {
    const listing = await Filesystem.readdir({ path: BACKUP_DIR, directory: dir })
    const files = listing.files
      .filter(f => f.name.startsWith('mnemos-auto-') && f.name.endsWith('.json'))
      .sort((a, b) => b.name.localeCompare(a.name)) // newest first

    if (files.length <= MAX_BACKUPS) return

    for (const file of files.slice(MAX_BACKUPS)) {
      try {
        await Filesystem.deleteFile({ path: `${BACKUP_DIR}/${file.name}`, directory: dir })
      } catch { /* deletion failures are non-fatal */ }
    }
  } catch { /* readdir failure is non-fatal */ }
}
