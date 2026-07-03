// Question mastery tier — derives tier from quiz progress.
// Reuses isInWrongBook from quizEngine for consistency with round-3's single definition.
//
// Tier mapping:
//   no progress / status 'todo' → 'new'
//   in wrong book (isInWrongBook) → 'weak'
//   answered, rightStreak >= 2 → 'solid'
//   otherwise → 'mid'

import { isInWrongBook } from './quizEngine'

export function questionTier(prog) {
  if (!prog || prog.status === 'todo' || (prog.attempts ?? 0) === 0) return 'new'
  if (isInWrongBook(prog)) return 'weak'
  if ((prog.rightStreak ?? 0) >= 2) return 'solid'
  return 'mid'
}

/**
 * Tier counts for a set of questions with progress.
 * @param {Array} questions - question objects
 * @param {Object} progress - { [questionId]: progressObj }
 */
export function tierCountsForQuestions(questions, progress) {
  const result = { weak: 0, mid: 0, solid: 0, new: 0 }
  for (const q of questions) {
    const tier = questionTier(progress[q.id])
    result[tier]++
  }
  return result
}
