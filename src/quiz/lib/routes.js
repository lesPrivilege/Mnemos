const QUIZ_KINDS = new Set(['quiz', 'quiz-review'])

export function buildQuizRoute(kind, subject, params = {}) {
  if (!QUIZ_KINDS.has(kind)) throw new Error(`Unknown quiz route kind: ${kind}`)
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') query.set(key, String(value))
  }
  const suffix = query.toString()
  return `/${kind}/${encodeURIComponent(subject)}${suffix ? `?${suffix}` : ''}`
}
