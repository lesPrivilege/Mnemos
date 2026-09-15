import { sm2 } from './sm2'
import { getCardSM2, updateCardSM2Confirmed } from './storage'
import { recordEvent, removeEvent } from './derive/events'

export function planRating(card, quality, passes = 0) {
  if (![1, 2, 4, 5].includes(quality)) throw new Error('无效评价')
  if (card.repetitions === 0) {
    if (quality <= 2) return { fields: null, passes: 0, requeue: true }
    if (quality === 4 && passes === 0) return { fields: null, passes: 1, requeue: true }
    return { fields: sm2(card, quality), passes: 0, requeue: false }
  }
  const fields = sm2(card, quality)
  if (quality === 1) {
    fields.lapses = (card.lapses || 0) + 1
    if (fields.lapses >= 8) { fields.leech = true; fields.suspended = true }
  }
  return { fields, passes: 0, requeue: quality === 1 && !fields.suspended && !card.suspended }
}

export async function commitRating(card, quality, passes, deckId) {
  const plan = planRating(card, quality, passes)
  const before = getCardSM2(card.id)
  if (!before) throw new Error('卡片已不存在。')
  if (plan.fields) await updateCardSM2Confirmed(card.id, plan.fields)
  const eventId = recordEvent({ module: 'recall', quality, itemId: card.id, deckId })
  if (!eventId) {
    if (plan.fields) {
      try { await updateCardSM2Confirmed(card.id, before) }
      catch { throw Object.assign(new Error('评价记录失败，卡片状态未能完全恢复。请退出并重新打开复习后核对。'), { requiresReload: true }) }
    }
    throw new Error('评价记录保存失败，请重试。')
  }
  return { ...plan, before, eventId, card: { ...card, ...plan.fields } }
}

export async function undoRating(action, cardId) {
  const current = getCardSM2(cardId)
  if (action.fields) await updateCardSM2Confirmed(cardId, action.before)
  if (!removeEvent(action.eventId)) {
    if (action.fields) {
      try { await updateCardSM2Confirmed(cardId, current) }
      catch { throw Object.assign(new Error('撤销未能完全恢复：卡片已恢复，评价记录仍保留。请退出并核对。'), { requiresReload: true }) }
    }
    throw new Error('撤销记录保存失败，请重试。')
  }
}
