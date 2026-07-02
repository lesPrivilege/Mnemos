import { formatLocalDate } from './dateUtils'

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
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

function addRecall(daysByDate) {
  const log = loadJson('mnemos-review-log', { entries: [] })
  for (const entry of log.entries || []) {
    if (entry.type !== 'flashcard' || !entry.timestamp) continue
    const date = dayKeyFromMs(entry.timestamp)
    const day = daysByDate.get(date)
    if (!day) continue
    day.recall += 1
    if ((entry.quality || 0) >= 4) day.recallCorrect += 1
  }
}

function addPracticeFromLog(daysByDate) {
  const log = loadJson('mnemos-review-log', { entries: [] })
  let found = false
  for (const entry of log.entries || []) {
    if (entry.type !== 'quiz' || !entry.timestamp) continue
    const date = dayKeyFromMs(entry.timestamp)
    const day = daysByDate.get(date)
    if (!day) continue
    found = true
    day.practice += 1
    if (entry.correct) day.practiceCorrect += 1
  }
  return found
}

function addPracticeFromProgress(daysByDate) {
  const progress = loadJson('examprep-progress', {})
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
  const stats = loadJson('reading-stats', { sessions: [] })
  for (const session of stats.sessions || []) {
    if (!session.startedAt) continue
    const date = dayKeyFromMs(session.startedAt)
    const day = daysByDate.get(date)
    if (!day) continue
    day.reading += session.minutesRead || 0
  }
}

function getStreak(activeDates) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = formatLocalDate(d)
    if (activeDates.has(key)) streak += 1
    else if (i > 0) break
  }
  return streak
}

export function getActivityDashboard() {
  const dates = monthDays()
  const daysByDate = new Map(dates.map((date) => [date, emptyDay(date)]))
  addRecall(daysByDate)
  if (!addPracticeFromLog(daysByDate)) addPracticeFromProgress(daysByDate)
  addReading(daysByDate)

  // Build 90-day window for streak calculation
  const streakDates = trailingDays(90)
  const streakByDate = new Map(streakDates.map((date) => [date, emptyDay(date)]))
  addRecall(streakByDate)
  if (!addPracticeFromLog(streakByDate)) addPracticeFromProgress(streakByDate)
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
    streak: getStreak(activeDates),
    maxDayTotal: Math.max(1, ...days.map((d) => d.total)),
  }
}
