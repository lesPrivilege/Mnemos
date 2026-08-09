import { formatLocalDate } from './dateUtils'
import { readEvents } from './derive/events'
import { streak as deriveStreak } from './derive'
import { activeDayKeys, readLegacyPracticeAttempts, readReadingSessions } from './derive/activeDays'

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

/* 练习之两源与阅读之源皆由 derive/activeDays 供给——兜底该不该取，那里判一次，
   此处不再各自决断（记-32）。 */
function addPractice(daysByDate, events) {
  for (const e of events) {
    if (e.module !== 'practice') continue
    const day = daysByDate.get(dayKeyFromMs(e.timestamp))
    if (!day) continue
    day.practice += 1
    if (e.correct) day.practiceCorrect += 1
  }
  for (const attempt of readLegacyPracticeAttempts(events)) {
    const day = daysByDate.get(dayKeyFromMs(attempt.timestamp))
    if (!day) continue
    day.practice += 1
    if (attempt.correct) day.practiceCorrect += 1
  }
}

function addReading(daysByDate) {
  for (const session of readReadingSessions()) {
    if (!session.startedAt) continue
    const day = daysByDate.get(dayKeyFromMs(session.startedAt))
    if (!day) continue
    day.reading += session.minutesRead || 0
  }
}

export function getActivityDashboard() {
  const events = readEvents()
  const activeKeys = activeDayKeys(events)
  const dates = monthDays()
  const daysByDate = new Map(dates.map((date) => [date, emptyDay(date)]))
  addRecall(daysByDate, events)
  addPractice(daysByDate, events)
  addReading(daysByDate)

  const days = dates.map((date) => {
    const day = daysByDate.get(date)
    return {
      /* total 是热力浓淡之标度，非可读之量——三模块量纲不同，故不挂单位、
         不入文案；要给人看的数一律分模块出（记-32）。 */
      ...day,
      total: day.recall + day.practice + day.reading,
      active: activeKeys.has(date),
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

  return {
    days,
    today,
    targets: TARGETS,
    totals,
    /* 焦点副句之两数同为「天」——旧此处以本周次数副之，而那个「次」是记忆次数
       ＋练习次数＋阅读分钟之和，三个量纲相加後挂一个单位（记-32）。 */
    monthActiveDays: days.filter((d) => d.active).length,
    weekActiveDays: thisWeek.filter((d) => d.active).length,
    streak: deriveStreak(activeKeys),
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
  addPractice(byDate, events)
  addReading(byDate)

  const days = dates.map(date => {
    const d = byDate.get(date)
    const total = d.recall + d.practice + d.reading
    return { date, recall: d.recall, practice: d.practice, reading: d.reading, total }
  })
  const maxTotal = Math.max(1, ...days.map(d => d.total))
  return { days, maxTotal }
}
