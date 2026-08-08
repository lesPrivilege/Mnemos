import { formatLocalDate } from './dateUtils'
import { isPlainObject, loadJson } from './store'
import { readEvents } from './derive/events'
import { streak as deriveStreak } from './derive'

function isStats(value) {
  return isPlainObject(value) && Array.isArray(value.sessions)
}

function dayKeyFromMs(ms) {
  return formatLocalDate(new Date(ms))
}

function monthDays(today = new Date()) {
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const days = []
  for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
    days.push(formatLocalDate(d))
  }
  return days
}

function trailingDays(windowDays = 90, today = new Date()) {
  const days = []
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    days.push(formatLocalDate(d))
  }
  return days
}

const TARGETS = {
  recall: 20,
  practice: 20,
  reading: 30,
}

function emptyDay(date) {
  return {
    date,
    recall: 0,
    recallCorrect: 0,
    practice: 0,
    practiceCorrect: 0,
    reading: 0,
  }
}

/* 事件流由 derive/events 单源供给（记-30）——此处不再各自 loadJson，
   亦不再各自判 v1 之 `type` 字段：升格与排序皆在上游一次做完。 */
function addRecall(daysByDate, events) {
  for (const e of events) {
    if (e.module !== 'recall') continue
    const day = daysByDate.get(dayKeyFromMs(e.timestamp))
    if (!day) continue
    day.recall += 1
    if ((e.quality || 0) >= 4) day.recallCorrect += 1
  }
}

function addPracticeFromLog(daysByDate, events) {
  let found = false
  for (const e of events) {
    if (e.module !== 'practice') continue
    const day = daysByDate.get(dayKeyFromMs(e.timestamp))
    if (!day) continue
    found = true
    day.practice += 1
    if (e.correct) day.practiceCorrect += 1
  }
  return found
}

function addPracticeFromProgress(daysByDate) {
  const progress = loadJson('examprep-progress', {}, isPlainObject)
  for (const item of Object.values(progress)) {
    if (!item?.last_attempt) continue
    const date = dayKeyFromMs(item.last_attempt * 1000)
    const day = daysByDate.get(date)
    if (!day) continue
    day.practice += 1
    if (item.status === 'correct') day.practiceCorrect += 1
  }
}

function addReading(daysByDate) {
  const stats = loadJson('reading-stats', { sessions: [] }, isStats)
  for (const session of stats.sessions || []) {
    if (!session.startedAt) continue
    const date = dayKeyFromMs(session.startedAt)
    const day = daysByDate.get(date)
    if (!day) continue
    day.reading += session.minutesRead || 0
  }
}

export function getActivityDashboard() {
  const events = readEvents()
  const dates = monthDays()
  const daysByDate = new Map(dates.map((date) => [date, emptyDay(date)]))
  addRecall(daysByDate, events)
  if (!addPracticeFromLog(daysByDate, events)) addPracticeFromProgress(daysByDate)
  addReading(daysByDate)

  // 活跃天数仍取 90 日窗（本月之外亦算「活跃」）；连续天数则归 derive 单源
  const streakDates = trailingDays(90)
  const streakByDate = new Map(streakDates.map((date) => [date, emptyDay(date)]))
  addRecall(streakByDate, events)
  if (!addPracticeFromLog(streakByDate, events)) addPracticeFromProgress(streakByDate)
  addReading(streakByDate)
  const activeDates = new Set(
    [...streakByDate.values()]
      .filter(d => d.recall + d.practice + d.reading > 0)
      .map(d => d.date)
  )

  const days = dates.map((date) => {
    const day = daysByDate.get(date)
    return {
      ...day,
      total: day.recall + day.practice + day.reading,
      active: day.recall + day.practice + day.reading > 0,
    }
  })

  const thisWeek = days.slice(-7)
  const today = days.at(-1) || emptyDay(dayKeyFromMs(Date.now()))
  const totals = days.reduce((sum, d) => ({
    recall: sum.recall + d.recall,
    recallCorrect: sum.recallCorrect + d.recallCorrect,
    practice: sum.practice + d.practice,
    practiceCorrect: sum.practiceCorrect + d.practiceCorrect,
    reading: sum.reading + d.reading,
    total: sum.total + d.total,
  }), { recall: 0, recallCorrect: 0, practice: 0, practiceCorrect: 0, reading: 0, total: 0 })

  const weekTotals = thisWeek.reduce((sum, d) => ({
    recall: sum.recall + d.recall,
    practice: sum.practice + d.practice,
    reading: sum.reading + d.reading,
    total: sum.total + d.total,
  }), { recall: 0, practice: 0, reading: 0, total: 0 })

  return {
    days,
    today,
    targets: TARGETS,
    totals,
    weekTotals,
    activeDays: activeDates.size,
    streak: deriveStreak(events),
    maxDayTotal: Math.max(1, ...days.map((d) => d.total)),
  }
}

/**
 * 90-day heatmap data: one entry per day with per-module totals.
 * Reuses the same source-reading helpers as getActivityDashboard.
 */
export function getHeatmapData() {
  const events = readEvents()
  const dates = trailingDays(90)
  const byDate = new Map(dates.map((date) => [date, emptyDay(date)]))
  addRecall(byDate, events)
  if (!addPracticeFromLog(byDate, events)) addPracticeFromProgress(byDate)
  addReading(byDate)

  const days = dates.map(date => {
    const d = byDate.get(date)
    const total = d.recall + d.practice + d.reading
    return { date, recall: d.recall, practice: d.practice, reading: d.reading, total }
  })
  const maxTotal = Math.max(1, ...days.map(d => d.total))
  return { days, maxTotal }
}
