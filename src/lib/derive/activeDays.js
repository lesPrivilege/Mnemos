/**
 * 跨模块活跃日 — 「这一天动过没有」之唯一判据（记-32）
 *
 * 立此件之由：`streak` 旧只问事件流（记忆、练习），而活动页之活跃天数另把
 * 阅读与旧练习进度也算进去。同一个「活跃」故有两义——只读了书的一天，活动页
 * 记作活跃，连续天数却归零，一屏之内自相矛盾。
 *
 * 活跃日之定义：当日记忆次数、练习次数或阅读分钟，任一大于零。同日多事件只
 * 算一天，日界取本地时区（`formatLocalDate`），不取 UTC。
 *
 * 三源在此汇一次，页面与派生量皆取此处，不各自再造（design-kanli §八「事件流
 * 派生区」槽位之续兑）。
 */

import { isPlainObject, loadJson } from '../store'
import { readEvents, dayKey } from './events'

const READING_KEY = 'reading-stats'
const LEGACY_PRACTICE_KEY = 'examprep-progress'

function isStats(value) {
  return isPlainObject(value) && Array.isArray(value.sessions)
}

/** 阅读会话（reading-stats）——阅读分钟之源。阅读事件尚未收入事件流（M3 收编）。 */
export function readReadingSessions() {
  return loadJson(READING_KEY, { sessions: [] }, isStats).sessions || []
}

/**
 * 旧练习进度兜底。
 *
 * 唯事件流通篇无练习事件时方取——否则同一次作答既在流内又在进度里，要记两遍。
 * 判据取全流而非取窗：窗口一变（本月 vs 90 日）兜底与否随之翻覆，则两处窗口
 * 对同一天可给出相反的答案。
 */
export function readLegacyPracticeAttempts(events = readEvents()) {
  if (events.some((e) => e.module === 'practice')) return []
  const progress = loadJson(LEGACY_PRACTICE_KEY, {}, isPlainObject)
  return Object.values(progress)
    .filter((item) => typeof item?.last_attempt === 'number')
    .map((item) => ({
      timestamp: item.last_attempt * 1000, // 旧进度以秒计
      correct: item.status === 'correct',
    }))
}

/**
 * 全部活跃日之键（本地日界，`YYYY-MM-DD`）。
 *
 * @param {Array} [events] - 事件流；传入以免同一轮内重复读盘
 * @returns {Set<string>}
 */
export function activeDayKeys(events = readEvents()) {
  const keys = new Set()

  for (const e of events) {
    if (e.module !== 'recall' && e.module !== 'practice') continue
    keys.add(dayKey(e.timestamp))
  }
  for (const attempt of readLegacyPracticeAttempts(events)) {
    keys.add(dayKey(attempt.timestamp))
  }
  for (const session of readReadingSessions()) {
    if (!session.startedAt) continue
    if (!((session.minutesRead || 0) > 0)) continue
    keys.add(dayKey(session.startedAt))
  }

  return keys
}
