/**
 * 派生选择器 — 界面之唯一数据出口（记-30）
 *
 * 立此层之由：同一事实曾有两套算法。`FlashcardHomeContent.computeStreak()`
 * 遍历 `card.updatedAt` 自算连续天数，而 `activity.js` 另从事件流算——同名
 * 不同义，且前者只见每张卡的**最後**一次更新，一日复习两张同卡即漏计。
 * 凡首页、活动页、完成屏、日後 widget 所需之派生量，一概出于此处；
 * 页面不得自算（design-kanli §八「事件流派生区」槽位之兑现）。
 *
 * 上游唯一：`./events`（事件流）、`./activeDays`（跨模块活跃日）与
 * `../scheduler`（卡片到期状态）。
 */

import { readEvents, splitSessions } from './events'
import { activeDayKeys } from './activeDays'
import { getAllDeckStats } from '../scheduler'
import { loadData } from '../storage'
import { isRecall } from '../cardUtils'
import { mastery, masteryTier } from '../cardStats'
import { localToday, localDow, formatLocalDate } from '../dateUtils'

/**
 * 今日焦点 — 焦点行所需之全部。
 * 一个主数、一句分解、一个去处；不返回「总数」「今日已复习」这类
 * 不支持决策之量（版1：composed relationships 取代 metric boxes）。
 */
export function todayFocus() {
  const decks = getAllDeckStats()
  const due = decks
    .filter((d) => d.dueCount > 0)
    .sort((a, b) => b.dueCount - a.dueCount)
  const dueTotal = due.reduce((sum, d) => sum + d.dueCount, 0)

  return {
    dueTotal,
    deckCount: decks.length,
    // 分解只列前二——第三个之後对「先做哪个」已无帮助
    breakdown: due.slice(0, 2).map((d) => ({ id: d.id, name: d.name, due: d.dueCount })),
    // 主行动之去处：有到期者取到期最多之册；全清则取首册复习全部
    primary: due[0]
      ? { deckId: due[0].id, all: false }
      : decks[0]
        ? { deckId: decks[0].id, all: true }
        : null,
  }
}

/**
 * 未来七日到期分布 — 投影到固定的周日→周六轴。
 * 每格携其真实日期与计数，标签由调用方按 strings 取，此处不涉文案。
 */
export function forecast7() {
  const today = localToday()
  const slots = Array.from({ length: 7 }, (_, dow) => ({ dow, date: null, count: 0, isToday: false }))

  for (const deck of getAllDeckStats()) {
    for (const d of deck.futureDistribution || []) {
      const slot = slots[localDow(d.date)]
      if (slot.date == null) {
        slot.date = d.date
        slot.isToday = d.date === today
      }
      if (slot.date === d.date) slot.count += d.count
    }
  }

  const total = slots.reduce((sum, s) => sum + s.count, 0)
  return { slots, total, max: Math.max(1, ...slots.map((s) => s.count)) }
}

/**
 * 连续天数 — 出于跨模块活跃日，非出于 card.updatedAt，亦不止于事件流（记-32）。
 * 记忆、练习、阅读任一动过即算这一天；今日尚未活动不断链（i > 0 方判断）。
 *
 * @param {Set<string>} [active] - 活跃日键集；传入以免同一轮内重复读盘
 */
export function streak(active = activeDayKeys()) {
  if (active.size === 0) return 0

  let count = 0
  const today = new Date()
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    if (active.has(formatLocalDate(d))) count += 1
    else if (i > 0) break
  }
  return count
}

/**
 * 单册熟练度 — 熟练度计与「弱 N」所需（记号谱，记-25）。
 * `masteryRatio` 即熟练度计之充填比例：已稳固者占几何。
 */
export function deckProgress(deckId) {
  const cards = loadData().cards.filter((c) => c.deckId === deckId && isRecall(c))
  const tiers = { weak: 0, mid: 0, solid: 0, new: 0 }
  for (const card of cards) {
    if ((card.repetitions ?? 0) === 0) tiers.new += 1
    else tiers[masteryTier(mastery(card))] += 1
  }
  const total = cards.length
  return {
    total,
    ...tiers,
    masteryRatio: total === 0 ? 0 : tiers.solid / total,
    lastReviewedAt: lastReviewedAt(deckId),
  }
}

/** 某册最近一次复习之时刻；从未复习者 null。 */
export function lastReviewedAt(deckId, events = readEvents()) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const e = events[i]
    if (e.module === 'recall' && e.deckId === deckId) return e.timestamp
  }
  return null
}

/**
 * 会话小结 — 完成屏之关系式（版1：本次 vs 上次，而非三个孤立数字）。
 * 会话由事件流按静默阈切分而得，不另存状态。
 *
 * @param {string} deckId - 只比同册之会话；跨册比较无义
 * @returns {{ count, durationMs, accuracy, again, prev, delta, nextDue }}
 *          prev / delta 於首次会话为 null——无可比者不编造比较。
 */
export function sessionSummary(deckId) {
  const events = readEvents()
  const sessions = splitSessions(
    events.filter((e) => e.module === 'recall' && e.deckId === deckId)
  )
  const last = sessions.at(-1)
  if (!last) return null

  const stat = (s) => {
    const n = s.events.length
    const good = s.events.filter((e) => (e.quality ?? 0) >= 4).length
    return {
      count: n,
      durationMs: s.endedAt - s.startedAt,
      accuracy: n === 0 ? 0 : Math.round((good / n) * 100),
      again: s.events.filter((e) => (e.quality ?? 0) <= 1).length,
      endedAt: s.endedAt,
    }
  }

  const current = stat(last)
  const prev = sessions.length > 1 ? stat(sessions.at(-2)) : null

  return {
    ...current,
    prev,
    delta: prev
      ? {
          count: current.count - prev.count,
          durationMs: current.durationMs - prev.durationMs,
          accuracy: current.accuracy - prev.accuracy,
        }
      : null,
    nextDue: nextDue(deckId),
  }
}

/** 该册下一批到期：日期与张数；无未来到期者 null。 */
export function nextDue(deckId) {
  const today = localToday()
  const upcoming = loadData()
    .cards.filter((c) => c.deckId === deckId && isRecall(c) && !c.suspended && c.dueDate > today)
    .map((c) => c.dueDate)
    .sort()
  if (upcoming.length === 0) return null
  const date = upcoming[0]
  return { date, count: upcoming.filter((d) => d === date).length }
}
