import { formatLocalDate } from './dateUtils'

// SM-2 间隔重复算法
// quality 映射: Again=1, Hard=2, Good=4, Easy=5

export function sm2(card, quality) {
  const { easiness, interval, repetitions } = card

  let newE, newInterval, newReps

  if (quality === 1) {
    // Again：重置
    newReps = 0
    newInterval = 1
    newE = easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  } else if (quality === 2) {
    // Hard：通过，缩短间隔
    newReps = repetitions + 1
    newInterval = Math.max(1, Math.round(interval * 1.2))
    newE = easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  } else {
    // 成功
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * easiness)
    }
    newReps = repetitions + 1
    newE = easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  }

  newE = Math.max(1.3, newE)

  const today = new Date()
  today.setDate(today.getDate() + newInterval)
  const dueDate = formatLocalDate(today)

  return {
    easiness: newE,
    interval: newInterval,
    repetitions: newReps,
    dueDate,
    updatedAt: new Date().toISOString(),
  }
}
