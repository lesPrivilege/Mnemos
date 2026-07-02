// 到期判定 + 排序逻辑
import { getDailyLimit, loadData } from './storage'
import { localToday, isoToLocalDate, formatLocalDate } from './dateUtils'
import { isRecall } from './cardUtils'

function dateAfterDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return formatLocalDate(d)
}

function getFutureDistribution(cards) {
  // 7 entries: today + next 6 days. Today's count uses dueDate <= today
  // (anything overdue still shows up under today, the soonest column).
  const futureDistribution = []
  const today = localToday()
  futureDistribution.push({
    date: today,
    count: cards.filter((c) => c.dueDate <= today).length,
  })
  for (let i = 1; i <= 6; i++) {
    const dateStr = dateAfterDays(i)
    const count = cards.filter((c) => c.dueDate === dateStr).length
    futureDistribution.push({ date: dateStr, count })
  }
  return futureDistribution
}

// 判断卡片是否到期（dueDate <= today）
export function isDue(card) {
  return card.dueDate <= localToday()
}

// 获取某个牌组中所有到期卡片，按 dueDate 升序
// 只返回 recall 类型（reference 卡片不参与复习调度），排除暂停卡片
export function getDueCards(deckId) {
  const data = loadData()
  const cards = data.cards
    .filter((c) => c.deckId === deckId && isRecall(c) && isDue(c) && !c.suspended)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const dailyLimit = getDailyLimit()
  return dailyLimit ? cards.slice(0, dailyLimit) : cards
}

// 获取某个牌组的统计信息
export function getDeckStats(deckId) {
  const data = loadData()
  const cards = data.cards.filter((c) => c.deckId === deckId)
  const recallCards = cards.filter((c) => isRecall(c))
  const activeCards = recallCards.filter((c) => !c.suspended)
  const t = localToday()

  const dueCount = activeCards.filter((c) => c.dueDate <= t).length
  const reviewedToday = recallCards.filter(
    (c) => c.updatedAt && isoToLocalDate(c.updatedAt) === t && c.repetitions > 0
  ).length
  const suspendedCount = recallCards.filter((c) => c.suspended).length

  return {
    total: cards.length,
    dueCount,
    reviewedToday,
    suspendedCount,
    futureDistribution: getFutureDistribution(activeCards),
  }
}

// 获取所有牌组概览（首页用）
export function getAllDeckStats() {
  const data = loadData()
  const t = localToday()

  return data.decks.map((deck) => {
    const cards = data.cards.filter((c) => c.deckId === deck.id)
    const recallCards = cards.filter((c) => isRecall(c))
    const activeCards = recallCards.filter((c) => !c.suspended)
    const dueCount = activeCards.filter((c) => c.dueDate <= t).length
    const reviewedToday = recallCards.filter(
      (c) => c.updatedAt && isoToLocalDate(c.updatedAt) === t && c.repetitions > 0
    ).length
    return {
      ...deck,
      totalCards: cards.length,
      dueCount,
      reviewedToday,
      futureDistribution: getFutureDistribution(activeCards),
    }
  })
}
