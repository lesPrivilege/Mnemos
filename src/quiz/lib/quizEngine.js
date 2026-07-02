// 练习引擎

import { loadQuestions, loadProgress, recordAttempt } from './storage'
import { shuffle } from '../../lib/utils'

export function hasValidAnswer(q) {
  if (q.type === 'choice') return Boolean(q.answer?.trim())
  return true // review 总是有有效内容
}

/** 错题本判定：做过错且未连续做对2次 */
export function isInWrongBook(prog) {
  return prog?.wrong_count > 0 && (prog?.rightStreak || 0) < 2
}

function isDueForReview(qid, progress) {
  const prog = progress[qid]
  if (!prog || prog.status !== 'wrong') return false
  const now = Math.floor(Date.now() / 1000)
  const intervals = [3600, 14400, 86400, 259200, 604800]
  const interval = intervals[Math.min((prog.attempts || 1) - 1, intervals.length - 1)]
  return now - (prog.last_attempt || 0) >= interval
}

/**
 * 获取题目列表
 * @param {object} opts
 * @param {string}  opts.subject
 * @param {string}  opts.chapter
 * @param {string}  opts.type       - 'choice'|'review' 留空=全部
 * @param {string}  opts.mode       - 'sequential'|'random'|'wrong'|'new'|'due'|'starred'
 * @param {number}  opts.limit
 * @param {string[]} opts.starredIds - 收藏题目 id 列表（mode=starred 时使用）
 */
export function getQuizQuestions(opts) {
  const { subject, chapter, type, mode = 'random', limit = 10, starredIds = [] } = opts
  const questions = loadQuestions()
  const progress = loadProgress()

  let filtered = questions
  if (subject) filtered = filtered.filter(q => q.subject === subject)
  if (chapter) filtered = filtered.filter(q => q.chapter === chapter)
  if (type) filtered = filtered.filter(q => q.type === type)

  switch (mode) {
    case 'sequential':
      break
    case 'random':
      filtered = shuffle(filtered)
      break
    case 'wrong':
      filtered = filtered.filter(q => isInWrongBook(progress[q.id]))
      filtered = shuffle(filtered)
      break
    case 'new':
      filtered = filtered.filter(q => !progress[q.id] || progress[q.id].status === 'todo')
      filtered = shuffle(filtered)
      break
    case 'due':
      filtered = filtered.filter(q => isDueForReview(q.id, progress))
      break
    case 'starred':
      filtered = filtered.filter(q => starredIds.includes(q.id))
      break
  }

  filtered = filtered.filter(q => hasValidAnswer(q))
  return filtered.slice(0, limit)
}

export function submitAnswer(questionId, userAnswer) {
  const questions = loadQuestions()
  const q = questions.find(x => x.id === questionId)
  if (!q) return { correct: null, explanation: '题目不存在', status: 'error' }

  let correct = null
  let explanation = q.explanation || ''

  if (q.type === 'choice') {
    const expected = q.answer?.trim().toUpperCase()
    const given = userAnswer?.trim().toUpperCase()
    const norm = s => s.replace(/[^A-Z]/g, '').split('').sort().join('')
    correct = norm(expected) === norm(given)
    if (!correct) explanation = `你的答案: ${given || '未作答'}。正确答案: ${expected}。${explanation}`
    const prog = recordAttempt(questionId, correct)
    return { correct, explanation, status: prog.status, wrongStreak: prog.wrongStreak }
  } else {
    // review: show reference answer, don't record — user self-rates
    explanation = q.answer || q.explanation || '暂无解析'
    if (q.solution_path) explanation = `参考答案路径: ${q.solution_path}\n\n${explanation}`
    return { correct: null, explanation, selfRate: true }
  }
}

export function markQuestion(questionId, correct) {
  return recordAttempt(questionId, correct)
}

/** 错题本：做过错且未连续做对2次的题 */
export function getWrongQuestions(subject, limit = 50) {
  const questions = loadQuestions()
  const progress = loadProgress()
  return questions
    .filter(q => isInWrongBook(progress[q.id]))
    .filter(q => !subject || q.subject === subject)
    .map(q => ({ ...q, ...progress[q.id] }))
    .sort((a, b) => (b.last_attempt || 0) - (a.last_attempt || 0))
    .slice(0, limit)
}
