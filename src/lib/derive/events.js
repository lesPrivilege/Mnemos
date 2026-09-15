/**
 * 事件流 — 派生数据之唯一上游（记-30；roadmap M3「格式即 API」之首实）
 *
 * localStorage key: mnemos-review-log
 * envelope: { schemaVersion: 2, entries: ReviewEvent[] }
 *
 * ReviewEvent = {
 *   id: string,
 *   timestamp: number,              // Date.now()
 *   module: 'recall' | 'practice',  // 与应用之三模块同名（阅读另有其流，M3 收编）
 *   itemId: string,                 // card.id 或 question.id
 *   deckId?: string,                // recall
 *   subject?: string,               // practice
 *   quality?: number,               // recall: 1/2/4/5
 *   correct?: boolean,              // practice
 * }
 *
 * v1 → v2：`type: 'flashcard' | 'quiz'` 归并为 `module: 'recall' | 'practice'`。
 * 迁移在读时进行并回写一次，非兼容层——v1 之形读完即弃（AGENTS.md 不留兼容路）。
 * 用户既存历史是磁盘上的数据，不是代码里的旧路，故迁移而不删。
 */

import { isPlainObject, loadJson, saveJson } from '../store'
import { formatLocalDate } from '../dateUtils'
import { S } from '../strings'

const LOG_KEY = 'mnemos-review-log'
export const SCHEMA_VERSION = 2
const MAX_AGE_DAYS = 90

/** 会话切分之静默阈：相邻两事件间隔逾此者，判为两场会话。 */
export const SESSION_GAP_MS = 30 * 60 * 1000

const MODULE_FROM_V1 = { flashcard: 'recall', quiz: 'practice' }

function isEnvelope(value) {
  return isPlainObject(value) && Array.isArray(value.entries)
}

/** v1 条目升格为 v2；已是 v2 者原样返回。返回 null 表示此条不可解，弃。 */
function upgrade(entry) {
  if (!isPlainObject(entry) || typeof entry.timestamp !== 'number') return null
  if (entry.module === 'recall' || entry.module === 'practice') return entry
  const module = MODULE_FROM_V1[entry.type]
  if (!module) return null
  const { type: _drop, ...rest } = entry
  return { ...rest, module }
}

function readEnvelope() {
  return loadJson(LOG_KEY, { schemaVersion: SCHEMA_VERSION, entries: [] }, isEnvelope)
}

function writeEnvelope(data) {
  return saveJson(LOG_KEY, data, { label: S.reviewLog.unsaved })
}

/**
 * 读全部事件（已升格、已按时序排定）。
 * 若磁盘上仍为 v1，升格後回写一次；回写失败不影响本次返回值。
 */
export function readEvents() {
  const data = readEnvelope()
  const raw = data.entries || []
  const events = raw.map(upgrade).filter(Boolean)
  events.sort((a, b) => a.timestamp - b.timestamp)

  if (data.schemaVersion !== SCHEMA_VERSION || events.length !== raw.length) {
    writeEnvelope({ schemaVersion: SCHEMA_VERSION, entries: events })
  }
  return events
}

/**
 * 记一条事件——**全应用唯一写入口**。
 * @param {object} event - { module, itemId, deckId?, subject?, quality?, correct? }
 */
export function recordEvent(event) {
  const events = readEvents()
  const entry = { ...event, id: crypto.randomUUID(), timestamp: Date.now() }
  events.push(entry)
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000
  const kept = events.filter((e) => e.timestamp >= cutoff)
  const envelope = { schemaVersion: SCHEMA_VERSION, entries: kept }

  const result = writeEnvelope(envelope)
  if (!result.ok) {
    // 存满：只留近 30 日再试一次
    const tighter = kept.filter((e) => e.timestamp >= Date.now() - 30 * 86400000)
    const retry = writeEnvelope({ schemaVersion: SCHEMA_VERSION, entries: tighter })
    return retry.ok ? entry.id : null
  }
  return entry.id
}

export function removeEvent(id) {
  if (!id) return false
  return writeEnvelope({ schemaVersion: SCHEMA_VERSION, entries: readEvents().filter(event => event.id !== id) }).ok
}

/** 本地日键（YYYY-MM-DD），全派生层共用同一口径。 */
export function dayKey(ms) {
  return formatLocalDate(new Date(ms))
}

/**
 * 按静默阈切分会话，早者在前。
 * 事件流本身即会话之记录，故会话无须另存——切分是派生，不是状态。
 */
export function splitSessions(events, gapMs = SESSION_GAP_MS) {
  const sessions = []
  let current = null
  for (const e of events) {
    if (!current || e.timestamp - current.endedAt > gapMs) {
      current = { module: e.module, startedAt: e.timestamp, endedAt: e.timestamp, events: [e] }
      sessions.push(current)
    } else {
      current.endedAt = e.timestamp
      current.events.push(e)
    }
  }
  return sessions
}
