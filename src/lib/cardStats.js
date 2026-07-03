// Card mastery model — derives a 0..1 mastery value from SM-2 fields.
// Used by structure view, Browse list, DeckDetail stats.
//
// Weights (documented per prompt requirement):
//   mastery = 0.40 * ef_norm + 0.40 * rep_factor + 0.20 * lapse_factor
//
//   ef_norm:      (easiness - 1.3) / 1.2, clamped [0, 1] — linear from SM-2 floor to default
//   rep_factor:   1 - 0.85^repetitions — exponential saturation, ~0.95 by rep 5
//   lapse_factor: max(0, 1 - lapses * 0.25) — linear penalty, 0 at 4+ lapses
//
// Edge cases:
//   repetitions === 0 → mastery = 0 (new card, tier = 'new' not 'weak')
//   suspended cards count normally (a leech IS weak knowledge — signal, not noise)

import { isRecall } from './cardUtils'

export const TIER_WEAK = 0.35
export const TIER_MID = 0.70

export function mastery(card) {
  if (!card || (card.repetitions ?? 0) === 0) return 0
  const efNorm = Math.max(0, Math.min(1, ((card.easiness ?? 2.5) - 1.3) / 1.2))
  const repFactor = 1 - Math.pow(0.85, card.repetitions ?? 0)
  const lapseFactor = Math.max(0, 1 - (card.lapses ?? 0) * 0.25)
  return 0.40 * efNorm + 0.40 * repFactor + 0.20 * lapseFactor
}

export function masteryTier(value) {
  if (value < TIER_WEAK) return 'weak'
  if (value < TIER_MID) return 'mid'
  return 'solid'
}

/**
 * Tier counts for a set of recall cards.
 * Cards with repetitions === 0 count as 'new', not 'weak'.
 * Non-recall (reference) cards are excluded.
 */
export function tierCounts(cards) {
  const result = { weak: 0, mid: 0, solid: 0, new: 0 }
  for (const card of cards) {
    if (!isRecall(card)) continue
    if ((card.repetitions ?? 0) === 0) { result.new++; continue }
    const tier = masteryTier(mastery(card))
    result[tier]++
  }
  return result
}
